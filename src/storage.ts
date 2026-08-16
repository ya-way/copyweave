import {blankStore, cloneStore, isRecord, normalizeStore} from "./schema.js";
import type {CopyStore, ResolvedCopyWeaveOptions} from "./types.js";

export interface ProjectSession {
  token: string;
  etag: string | null;
  siteId: string | null;
}

export type ProjectLoadError = "not-found" | "http-error" | "invalid-json" | "invalid-content" | "site-mismatch" | "network-error";

export interface ProjectLoadResult {
  store: CopyStore | null;
  etag: string | null;
  error: ProjectLoadError | null;
  status: number | null;
}

interface BrowserDraft {
  format: "copyweave/draft";
  version: 1;
  siteId: string;
  updatedAt: string;
  baseEtag: string | null;
  baseStore: CopyStore | null;
  store: CopyStore;
}

const normalizeDraft = (value: unknown, siteId: string): BrowserDraft | null => {
  if (!isRecord(value) || value.format !== "copyweave/draft" || value.version !== 1 || value.siteId !== siteId) return null;
  const store = normalizeStore(value.store, siteId);
  const baseStore = value.baseStore === null ? null : normalizeStore(value.baseStore, siteId);
  const baseEtag = value.baseEtag === null || typeof value.baseEtag === "string" ? value.baseEtag : undefined;
  if (!store || baseStore === null && value.baseStore !== null || baseEtag === undefined) return null;
  return {
    format: "copyweave/draft",
    version: 1,
    siteId,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : store.updatedAt,
    baseEtag,
    baseStore,
    store,
  };
};

export const readBrowserStore = (options: ResolvedCopyWeaveOptions) => {
  try {
    const raw = localStorage.getItem(options.storageKey);
    if (!raw) return {store: blankStore(options.siteId), baseStore: null, baseEtag: null, available: true, found: false, legacy: false, invalidRaw: null};
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return {store: blankStore(options.siteId), baseStore: null, baseEtag: null, available: true, found: false, legacy: false, invalidRaw: raw};
    }
    const draft = normalizeDraft(parsed, options.siteId);
    if (draft) return {store: draft.store, baseStore: draft.baseStore, baseEtag: draft.baseEtag, available: true, found: true, legacy: false, invalidRaw: null};
    const store = normalizeStore(parsed, options.siteId);
    return store
      ? {store, baseStore: null, baseEtag: null, available: true, found: true, legacy: true, invalidRaw: null}
      : {store: blankStore(options.siteId), baseStore: null, baseEtag: null, available: true, found: false, legacy: false, invalidRaw: raw};
  } catch {
    return {store: blankStore(options.siteId), baseStore: null, baseEtag: null, available: false, found: false, legacy: false, invalidRaw: null};
  }
};

export const writeBrowserStore = (
  options: ResolvedCopyWeaveOptions,
  store: CopyStore,
  baseStore: CopyStore | null,
  baseEtag: string | null,
) => {
  try {
    const draft: BrowserDraft = {
      format: "copyweave/draft",
      version: 1,
      siteId: options.siteId,
      updatedAt: store.updatedAt,
      baseEtag,
      baseStore: baseStore ? cloneStore(baseStore) : null,
      store: cloneStore(store),
    };
    localStorage.setItem(options.storageKey, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
};

export const loadProjectStore = async (options: ResolvedCopyWeaveOptions): Promise<ProjectLoadResult> => {
  if (!options.contentUrl) return {store: null, etag: null, error: null, status: null};
  try {
    const response = await fetch(options.contentUrl, {cache: "no-store"});
    if (!response.ok) return {store: null, etag: null, error: response.status === 404 ? "not-found" : "http-error", status: response.status};
    let raw: unknown;
    try {
      raw = await response.json() as unknown;
    } catch {
      return {store: null, etag: response.headers.get("etag"), error: "invalid-json", status: response.status};
    }
    if (isRecord(raw) && typeof raw.siteId === "string" && raw.siteId !== options.siteId) {
      return {store: null, etag: response.headers.get("etag"), error: "site-mismatch", status: response.status};
    }
    const store = normalizeStore(raw, options.siteId);
    return store
      ? {store, etag: response.headers.get("etag"), error: null, status: response.status}
      : {store: null, etag: response.headers.get("etag"), error: "invalid-content", status: response.status};
  } catch {
    return {store: null, etag: null, error: "network-error", status: null};
  }
};

export const loadProjectSession = async (options: ResolvedCopyWeaveOptions) => {
  if (!options.sessionUrl) return null;
  try {
    const response = await fetch(options.sessionUrl, {cache: "no-store"});
    if (!response.ok) return null;
    const value = (await response.json()) as unknown;
    if (!value || typeof value !== "object") return null;
    const token = Reflect.get(value, "token");
    const etag = Reflect.get(value, "etag");
    const siteId = Reflect.get(value, "siteId");
    if (typeof token !== "string") return null;
    return {token, etag: typeof etag === "string" ? etag : null, siteId: typeof siteId === "string" ? siteId : null} satisfies ProjectSession;
  } catch {
    return null;
  }
};
