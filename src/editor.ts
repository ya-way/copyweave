import {discoverFields, insertPlainText, type FieldBinding} from "./fields.js";
import {resolveOptions} from "./options.js";
import {createPanel, type PanelHandle} from "./panel.js";
import {
  MAX_COPY_LENGTH,
  MAX_FIELDS,
  MAX_PAGES,
  blankPage,
  cloneStore,
  countOverrides,
  countStoredFields,
  mergeStores,
  normalizeStore,
  storesHaveSamePages,
} from "./schema.js";
import {installGlobalStyles} from "./styles.js";
import {
  loadProjectSession,
  loadProjectStore,
  readBrowserStore,
  writeBrowserStore,
  type ProjectSession,
} from "./storage.js";
import type {CopyStore, CopyWeaveController, CopyWeaveDiagnostic, CopyWeaveOptions} from "./types.js";

const rootContains = (root: ParentNode, node: Node) =>
  root === document || root === document.body || (root instanceof Node && root.contains(node));

const visibleByActivation = (activation: "always" | "query" | "manual", query: string) => {
  if (activation === "always") return true;
  if (activation === "manual") return false;
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").has(query);
  } catch {
    return false;
  }
};

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const createCopyWeave = (input: CopyWeaveOptions = {}): CopyWeaveController => {
  if (typeof document === "undefined") throw new Error("CopyWeave requires a browser document.");
  const declaredSiteId = input.siteId ?? document.documentElement.dataset.copyweaveSite;
  const hasExplicitSiteId = typeof declaredSiteId === "string" && declaredSiteId.trim().length > 0;
  const options = resolveOptions(input);
  const styles = installGlobalStyles();
  const html = document.documentElement;
  const previousAccent = html.style.getPropertyValue("--copyweave-accent");
  html.style.setProperty("--copyweave-accent", options.theme.accent);

  const browserState = readBrowserStore(options);
  let invalidBrowserDraftRaw = browserState.invalidRaw;
  const initialBrowserStore = cloneStore(browserState.store);
  let store = cloneStore(browserState.store);
  let projectBaseStore = browserState.baseStore ? cloneStore(browserState.baseStore) : null;
  let projectBaseEtag = browserState.baseEtag;
  let latestProjectStore: CopyStore | null = null;
  let projectConflict = false;
  let projectConflictStatus = options.messages.conflict;
  let storageAvailable = browserState.available;
  let projectEtag: string | null = null;
  let session: ProjectSession | null = null;
  let editing = false;
  let destroyed = false;
  let projectLoaded = false;
  let projectBaseLoaded = false;
  let sessionSiteMismatch = false;
  let projectUnavailableStatus = options.messages.projectUnavailable;
  let replaceBeforeProjectLoad = false;
  const pendingFieldChanges = new Map<string, Map<string, string | null>>();
  const pendingPageResets = new Set<string>();
  let saveTimer = 0;
  let resetTimer = 0;
  let resetArmed = false;
  let fieldAbort = new AbortController();
  const globalAbort = new AbortController();
  let fields = new Map<string, FieldBinding>();
  let discoveryDiagnostics: CopyWeaveDiagnostic[] = [];
  let stateDiagnostics: CopyWeaveDiagnostic[] = [
    ...(!hasExplicitSiteId ? [{
      code: "implicit-site-id",
      level: "warning" as const,
      message: "No explicit siteId was configured. Set siteId (or data-copyweave-site) to prevent browser drafts from colliding with another project on the same origin.",
    }] : []),
    ...(!browserState.available ? [{
      code: "browser-storage-unavailable",
      level: "error" as const,
      message: options.messages.storageUnavailable,
    }] : []),
    ...(browserState.invalidRaw ? [{
      code: "invalid-browser-draft",
      level: "error" as const,
      message: options.messages.invalidBrowserDraft,
    }] : []),
  ];
  let diagnostics: CopyWeaveDiagnostic[] = [];
  let fieldOrder: FieldBinding[] = [];
  let activeIndex = -1;
  const sourceDefaults = new Map<string, string>();
  let panel: PanelHandle;

  const status = (message: string) => {
    panel?.setStatus(message);
    options.onStatus?.(message);
  };

  const rebuildDiagnostics = () => {
    diagnostics = [...discoveryDiagnostics, ...stateDiagnostics];
  };

  const setStateDiagnostic = (diagnostic: CopyWeaveDiagnostic) => {
    stateDiagnostics = [...stateDiagnostics.filter((item) => item.code !== diagnostic.code), diagnostic];
    rebuildDiagnostics();
  };

  const clearStateDiagnostic = (code: string) => {
    stateDiagnostics = stateDiagnostics.filter((item) => item.code !== code);
    rebuildDiagnostics();
  };

  const updatePersistenceState = () => {
    if (!panel) return;
    if (projectConflict) {
      panel.setPersistenceState(options.messages.stateConflict, "conflict");
      return;
    }
    if (invalidBrowserDraftRaw !== null) {
      panel.setPersistenceState(options.messages.stateInvalidDraft, "conflict");
      return;
    }
    if (!storageAvailable) {
      panel.setPersistenceState(options.messages.stateStorageUnavailable, "unavailable");
      return;
    }
    if (!projectLoaded) {
      panel.setPersistenceState(options.messages.stateLoading, "loading");
      return;
    }
    if (projectBaseLoaded && latestProjectStore && storesHaveSamePages(store, latestProjectStore)) {
      panel.setPersistenceState(options.messages.stateProjectSynced, "project");
      return;
    }
    if (countStoredFields(store) > 0) {
      panel.setPersistenceState(options.messages.stateBrowserDraft, "browser");
      return;
    }
    panel.setPersistenceState(
      options.contentUrl ? options.messages.stateProjectUnavailable : options.messages.stateSourceOnly,
      options.contentUrl ? "unavailable" : "source",
    );
  };

  const updateCounts = () => {
    panel?.setCounts(countOverrides(store, options.pageId), fields.size);
    updatePersistenceState();
  };

  const setProjectConflict = (message: string, visibleStatus = options.messages.conflict) => {
    projectConflict = true;
    projectConflictStatus = visibleStatus;
    setStateDiagnostic({code: "project-draft-conflict", level: "error", message});
    updatePersistenceState();
  };

  const clearProjectConflict = () => {
    projectConflict = false;
    projectConflictStatus = options.messages.conflict;
    clearStateDiagnostic("project-draft-conflict");
  };

  const archiveInvalidBrowserDraft = () => {
    if (invalidBrowserDraftRaw === null) return true;
    try {
      const recoveryKey = `${options.storageKey}:recovery:${Date.now()}`;
      localStorage.setItem(recoveryKey, invalidBrowserDraftRaw);
      invalidBrowserDraftRaw = null;
      clearStateDiagnostic("invalid-browser-draft");
      setStateDiagnostic({
        code: "browser-draft-archived",
        level: "info",
        message: `The unreadable browser draft was archived at localStorage key ${recoveryKey}.`,
      });
      return true;
    } catch {
      storageAvailable = false;
      setStateDiagnostic({code: "browser-storage-unavailable", level: "error", message: options.messages.storageUnavailable});
      status(options.messages.storageUnavailable);
      updateCounts();
      return false;
    }
  };

  const persistBrowser = (message?: string) => {
    window.clearTimeout(saveTimer);
    if (invalidBrowserDraftRaw !== null) {
      if (message) status(options.messages.invalidBrowserDraft);
      updateCounts();
      return false;
    }
    storageAvailable = writeBrowserStore(options, store, projectBaseStore, projectBaseEtag);
    if (storageAvailable) {
      clearStateDiagnostic("browser-storage-unavailable");
      if (message) status(message);
    } else {
      setStateDiagnostic({code: "browser-storage-unavailable", level: "error", message: options.messages.storageUnavailable});
      status(options.messages.storageUnavailable);
    }
    updateCounts();
    return storageAvailable;
  };

  const scheduleBrowserSave = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => persistBrowser(options.messages.savedBrowser), options.saveDebounceMs);
  };

  const applyPage = () => {
    const page = store.pages[options.pageId] ?? {};
    for (const field of fields.values()) {
      field.write(Object.hasOwn(page, field.key) ? page[field.key]! : field.defaultValue);
    }
    updateCounts();
  };

  const setFieldCopy = (field: FieldBinding) => {
    const value = field.read();
    const override = value === field.defaultValue ? null : value;
    const existingPage = store.pages[options.pageId];
    const hasExistingValue = Boolean(existingPage && Object.hasOwn(existingPage, field.key));
    const existingValue = hasExistingValue ? existingPage![field.key] : undefined;
    const reject = (code: string, message: string) => {
      field.write(existingValue ?? field.defaultValue);
      field.element.setAttribute("aria-label", `${field.key}: ${(existingValue ?? field.defaultValue).slice(0, 60)}`);
      setStateDiagnostic({code, level: "error", message, key: field.key});
      status(message);
      updateCounts();
    };
    if (Array.from(value).length > MAX_COPY_LENGTH) {
      reject("field-copy-too-long", options.messages.copyTooLong);
      return;
    }
    const addsPage = override !== null && !existingPage;
    const addsField = override !== null && !hasExistingValue;
    if (addsPage && Object.keys(store.pages).length >= MAX_PAGES || addsField && countStoredFields(store) >= MAX_FIELDS) {
      reject("content-limit-reached", options.messages.contentLimitReached);
      return;
    }
    clearStateDiagnostic("field-copy-too-long");
    clearStateDiagnostic("content-limit-reached");
    field.element.setAttribute("aria-label", `${field.key}: ${value.slice(0, 60)}`);
    const page = (store.pages[options.pageId] ??= blankPage());
    if (override === null) delete page[field.key];
    else page[field.key] = override;
    if (Object.keys(page).length === 0) delete store.pages[options.pageId];
    if (!projectLoaded && !replaceBeforeProjectLoad) {
      const changes = pendingFieldChanges.get(options.pageId) ?? new Map<string, string | null>();
      changes.set(field.key, override);
      pendingFieldChanges.set(options.pageId, changes);
    }
    store.updatedAt = new Date().toISOString();
    updateCounts();
    scheduleBrowserSave();
  };

  const bindFieldEvents = (field: FieldBinding) => {
    const signal = fieldAbort.signal;
    field.element.addEventListener("input", () => setFieldCopy(field), {signal});
    field.element.addEventListener("focus", () => {
      activeIndex = fieldOrder.indexOf(field);
    }, {signal});
    field.element.addEventListener("paste", insertPlainText, {signal});
    field.element.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        field.element.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        field.element.blur();
      }
    }, {signal});
  };

  const refresh = () => {
    if (destroyed) return;
    const nextPageId = options.resolvePageId();
    if (nextPageId !== options.pageId) {
      options.pageId = nextPageId;
      options.pageName = options.resolvePageName(nextPageId);
      panel?.setPage(options.pageName);
    }
    const wasEditing = editing;
    fieldAbort.abort();
    for (const field of fields.values()) field.destroy();
    fieldAbort = new AbortController();

    const discovery = discoverFields({
      root: options.root,
      mode: options.mode,
      idAttribute: options.idAttribute,
      ignoreAttribute: options.ignoreAttribute,
      exclude: options.exclude,
    });
    fields = discovery.fields;
    discoveryDiagnostics = discovery.diagnostics;
    rebuildDiagnostics();
    fieldOrder = Array.from(fields.values());

    for (const field of fieldOrder) {
      const sourceKey = `${options.pageId}\u0000${field.key}`;
      const sourceDefault = sourceDefaults.get(sourceKey);
      if (sourceDefault === undefined) sourceDefaults.set(sourceKey, field.defaultValue);
      else field.defaultValue = sourceDefault;
      bindFieldEvents(field);
      field.setEditing(wasEditing, options.messages.emptyPlaceholder);
    }
    applyPage();
  };

  const open = () => {
    if (destroyed) return;
    editing = true;
    panel.setVisible(true);
    panel.setOpen(true);
    html.dataset.copyweaveEditing = "true";
    for (const field of fields.values()) field.setEditing(true, options.messages.emptyPlaceholder);
    status(projectConflict ? projectConflictStatus : storageAvailable ? options.messages.editing : options.messages.storageUnavailable);
  };

  const close = () => {
    if (destroyed) return;
    editing = false;
    delete html.dataset.copyweaveEditing;
    for (const field of fields.values()) field.setEditing(false, options.messages.emptyPlaceholder);
    persistBrowser(options.messages.savedBrowser);
    panel.setOpen(false);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportStore = (filename = `copyweave-${options.siteId}-${today()}.json`) => {
    if (invalidBrowserDraftRaw !== null) {
      downloadText(invalidBrowserDraftRaw, `copyweave-${options.siteId}-invalid-draft-${today()}.json`);
      status(options.messages.invalidBrowserDraftExported);
      return;
    }
    const browserSaved = persistBrowser();
    downloadText(`${JSON.stringify(store, null, 2)}\n`, filename);
    status(browserSaved ? options.messages.exportRequested : options.messages.exportRequestedNoBrowser);
  };

  const importStore = (inputValue: string | CopyStore) => {
    try {
      const serialized = typeof inputValue === "string" ? inputValue : JSON.stringify(inputValue);
      if (new Blob([serialized]).size > 2 * 1024 * 1024) {
        status(options.messages.importTooLarge);
        return false;
      }
      const raw = JSON.parse(serialized) as unknown;
      const imported = normalizeStore(raw, options.siteId);
      if (!imported) throw new Error("invalid CopyWeave content");
      if (!archiveInvalidBrowserDraft()) return false;
      if (!projectLoaded) {
        replaceBeforeProjectLoad = true;
        pendingFieldChanges.clear();
        pendingPageResets.clear();
      }
      if (projectLoaded && projectConflict && latestProjectStore) {
        projectBaseStore = cloneStore(latestProjectStore);
        projectBaseEtag = projectEtag;
        clearProjectConflict();
      }
      store = cloneStore(imported);
      store.updatedAt = new Date().toISOString();
      applyPage();
      persistBrowser(options.messages.importSuccess);
      return true;
    } catch {
      status(options.messages.importInvalid);
      return false;
    }
  };

  const resetPage = () => {
    if (!archiveInvalidBrowserDraft()) return;
    if (!projectLoaded && !replaceBeforeProjectLoad) {
      pendingPageResets.add(options.pageId);
      pendingFieldChanges.delete(options.pageId);
    }
    delete store.pages[options.pageId];
    store.updatedAt = new Date().toISOString();
    applyPage();
    persistBrowser(options.messages.restored);
  };

  const focusRelative = (direction: -1 | 1) => {
    if (!fieldOrder.length) return;
    activeIndex = activeIndex < 0
      ? direction === 1 ? 0 : fieldOrder.length - 1
      : (activeIndex + direction + fieldOrder.length) % fieldOrder.length;
    const field = fieldOrder[activeIndex];
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    field?.element.scrollIntoView({block: "center", behavior: reducedMotion ? "auto" : "smooth"});
    field?.element.focus({preventScroll: true});
  };

  const save = async () => {
    status(options.messages.saving);
    await ready;
    if (!archiveInvalidBrowserDraft()) return false;
    if (projectConflict) {
      persistBrowser();
      status(projectConflictStatus);
      return false;
    }
    store.updatedAt = new Date().toISOString();
    const browserSaved = persistBrowser();
    if (!options.saveUrl || !session) {
      status(browserSaved
        ? sessionSiteMismatch ? options.messages.projectSiteMismatch : options.messages.saveUnavailable
        : options.messages.storageUnavailable);
      return false;
    }
    if (!projectBaseLoaded || !projectEtag) {
      status(projectUnavailableStatus);
      return false;
    }

    try {
      const response = await fetch(options.saveUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CopyWeave-Token": session.token,
          "If-Match": projectEtag,
        },
        body: JSON.stringify(store),
      });
      if (response.status === 412) {
        setProjectConflict("The project revision changed after this browser draft was based on it.", options.messages.staleProject);
        status(options.messages.staleProject);
        return false;
      }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) status(options.messages.saveSessionInvalid);
        else if ([400, 413, 415, 422].includes(response.status)) status(options.messages.saveRejected);
        else if (response.status >= 500) status(options.messages.saveWriteFailed);
        else status(options.messages.saveNetworkFailed);
        return false;
      }
      projectEtag = response.headers.get("etag") ?? projectEtag;
      session.etag = projectEtag;
      projectBaseStore = cloneStore(store);
      projectBaseEtag = projectEtag;
      latestProjectStore = cloneStore(store);
      clearProjectConflict();
      const browserProjectSaved = persistBrowser();
      status(browserProjectSaved ? options.messages.savedProject : options.messages.savedProjectNoBrowser);
      options.onSave?.(cloneStore(store));
      return true;
    } catch {
      status(options.messages.saveNetworkFailed);
      return false;
    }
  };

  panel = createPanel(options, {
    onOpen: open,
    onClose: close,
    onSave: () => void save(),
    onExport: () => exportStore(),
    onImport: (text) => importStore(text),
    onImportTooLarge: () => status(options.messages.importTooLarge),
    onReset: () => {
      if (!resetArmed) {
        resetArmed = true;
        panel.setResetArmed(true);
        status(options.messages.resetArmed);
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          resetArmed = false;
          panel.setResetArmed(false);
        }, 4000);
        return;
      }
      window.clearTimeout(resetTimer);
      resetArmed = false;
      panel.setResetArmed(false);
      resetPage();
    },
    onPrevious: () => focusRelative(-1),
    onNext: () => focusRelative(1),
  });

  refresh();
  panel.setVisible(visibleByActivation(options.activation, options.activationQuery));
  updateCounts();
  if (!storageAvailable) status(options.messages.storageUnavailable);

  const ready = Promise.all([loadProjectStore(options), loadProjectSession(options)]).then(([project, projectSession]) => {
    projectEtag = project.etag ?? projectSession?.etag ?? null;
    session = projectSession?.siteId && projectSession.siteId !== options.siteId ? null : projectSession;
    if (projectSession?.siteId && projectSession.siteId !== options.siteId) {
      sessionSiteMismatch = true;
      setStateDiagnostic({
        code: "session-site-mismatch",
        level: "error",
        message: `Session site ${projectSession.siteId} does not match ${options.siteId}.`,
      });
    }
    if (project.error) {
      projectUnavailableStatus = project.error === "not-found"
        ? options.messages.projectNotFound
        : project.error === "site-mismatch"
          ? options.messages.projectSiteMismatch
          : project.error === "invalid-json" || project.error === "invalid-content"
            ? options.messages.projectInvalid
            : options.messages.projectLoadFailed;
      setStateDiagnostic({
        code: `project-load-${project.error}`,
        level: "error",
        message: `${projectUnavailableStatus}${project.status ? ` (HTTP ${project.status})` : ""}`,
      });
    }
    if (project.store) {
      projectBaseLoaded = true;
      latestProjectStore = cloneStore(project.store);
      const hasPendingChanges = pendingPageResets.size > 0 || pendingFieldChanges.size > 0;
      if (replaceBeforeProjectLoad) {
        projectBaseStore = cloneStore(project.store);
        projectBaseEtag = projectEtag;
      } else if (hasPendingChanges) {
        const pendingTimestamp = store.updatedAt;
        const merged = cloneStore(project.store);
        for (const pageId of pendingPageResets) delete merged.pages[pageId];
        for (const [pageId, changes] of pendingFieldChanges) {
          const page = (merged.pages[pageId] ??= blankPage());
          for (const [fieldId, copy] of changes) {
            if (copy === null) delete page[fieldId];
            else page[fieldId] = copy;
          }
          if (Object.keys(page).length === 0) delete merged.pages[pageId];
        }
        merged.updatedAt = pendingTimestamp;
        store = merged;
        projectBaseStore = cloneStore(project.store);
        projectBaseEtag = projectEtag;
      } else if (projectBaseStore) {
        const result = mergeStores(projectBaseStore, initialBrowserStore, project.store);
        store = result.store;
        if (result.conflicts.length) {
          setProjectConflict(`${result.conflicts.length} field(s) changed in both the browser draft and project file.`);
        } else {
          projectBaseStore = cloneStore(project.store);
          projectBaseEtag = projectEtag;
          clearProjectConflict();
        }
      } else if (!browserState.found || Object.keys(initialBrowserStore.pages).length === 0 || storesHaveSamePages(initialBrowserStore, project.store)) {
        store = cloneStore(project.store);
        projectBaseStore = cloneStore(project.store);
        projectBaseEtag = projectEtag;
      } else if (Object.keys(project.store.pages).length === 0) {
        store = cloneStore(initialBrowserStore);
        projectBaseStore = cloneStore(project.store);
        projectBaseEtag = projectEtag;
      } else {
        store = cloneStore(initialBrowserStore);
        setProjectConflict(browserState.legacy
          ? "A legacy browser draft has no project baseline and cannot be merged safely."
          : "The browser draft has no project baseline and cannot be merged safely.");
      }
      if (!normalizeStore(store, options.siteId)) {
        store = cloneStore(initialBrowserStore);
        projectBaseLoaded = false;
        setProjectConflict("The browser draft and project file exceed CopyWeave content limits when combined. Export the draft and reconcile the files manually.");
      }
      applyPage();
      persistBrowser();
    }
    projectLoaded = true;
    pendingFieldChanges.clear();
    pendingPageResets.clear();
    if (projectConflict) status(projectConflictStatus);
    else if (!storageAvailable) status(options.messages.storageUnavailable);
    updateCounts();
  });

  document.addEventListener("click", (event) => {
    if (!editing || !(event.target instanceof Element) || !rootContains(options.root, event.target)) return;
    const interactive = event.target.closest("a,button");
    if (!interactive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.target.closest<HTMLElement>("copyweave-field,[data-copyweave-field]")?.focus();
  }, {capture: true, signal: globalAbort.signal});

  document.addEventListener("keydown", (event) => {
    if (!editing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
    if (event.key === "Escape" && !(event.target instanceof HTMLElement && event.target.matches("copyweave-field,[data-copyweave-field]"))) {
      close();
    }
  }, {signal: globalAbort.signal});

  window.addEventListener("beforeunload", () => {
    if (saveTimer) persistBrowser();
  }, {signal: globalAbort.signal});

  return {
    open,
    close,
    toggle: () => editing ? close() : open(),
    refresh,
    save,
    export: exportStore,
    import: importStore,
    resetPage,
    getStore: () => cloneStore(store),
    getDiagnostics: () => diagnostics.map((diagnostic) => ({...diagnostic})),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.clearTimeout(saveTimer);
      window.clearTimeout(resetTimer);
      fieldAbort.abort();
      globalAbort.abort();
      delete html.dataset.copyweaveEditing;
      if (previousAccent) html.style.setProperty("--copyweave-accent", previousAccent);
      else html.style.removeProperty("--copyweave-accent");
      for (const field of fields.values()) field.destroy();
      panel.destroy();
      if (styles.owned) styles.element.remove();
    },
  };
};
