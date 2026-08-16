import {beforeEach, describe, expect, it, vi} from "vitest";
import {createCopyWeave} from "../src/editor";

describe("browser editor", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-copyweave-editing");
    document.documentElement.lang = "en";
    document.body.innerHTML = '<main><h1 data-copy-id="hero.title">Original title</h1><a href="/next" data-copy-id="nav.next">Next</a></main>';
    localStorage.clear();
  });

  it("edits plain text, saves a browser draft, and restores source copy", () => {
    const editor = createCopyWeave({siteId: "test", pageId: "home", activation: "always", contentUrl: false, saveUrl: false, sessionUrl: false});
    editor.open();
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    expect(title.getAttribute("contenteditable")).toBe("plaintext-only");

    title.textContent = "A human title";
    title.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: "A human title"}));
    expect(editor.getStore().pages.home?.["hero.title"]).toBe("A human title");
    expect(title.getAttribute("aria-label")).toContain("A human title");

    editor.resetPage();
    expect(title.textContent?.trim()).toBe("Original title");
    editor.destroy();
    expect(document.querySelector("[data-copyweave-field]")).toBeNull();
  });

  it("rejects unsafe site and page identifiers before any draft can be written", () => {
    expect(() => createCopyWeave({siteId: "constructor", pageId: "home", activation: "manual"})).toThrow(/invalid CopyWeave siteId/i);
    expect(() => createCopyWeave({siteId: "safe", pageId: "__proto__", activation: "manual"})).toThrow(/invalid CopyWeave pageId/i);
  });

  it("treats Object prototype names as ordinary own field IDs", () => {
    document.body.innerHTML = '<main><h1 data-copy-id="toString">Default title</h1><p data-copy-id="other">Other</p></main>';
    const editor = createCopyWeave({siteId: "prototype-names", pageId: "home", activation: "always", contentUrl: false, saveUrl: false, sessionUrl: false});
    editor.open();
    const other = document.querySelector<HTMLElement>('[data-copy-id="other"]')!;
    other.textContent = "Edited other";
    other.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));
    editor.refresh();
    expect(document.querySelector('[data-copy-id="toString"]')?.textContent).toBe("Default title");
    expect(editor.getStore().pages.home?.other).toBe("Edited other");
    editor.destroy();
  });

  it("rejects oversized field input without clearing other browser draft fields", async () => {
    const statuses: string[] = [];
    const editor = createCopyWeave({
      siteId: "input-limits",
      pageId: "home",
      activation: "always",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      onStatus: (message) => statuses.push(message),
    });
    editor.open();
    const link = document.querySelector<HTMLElement>('[data-copy-id="nav.next"]')!;
    link.textContent = "Kept draft";
    link.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: "Kept draft"}));
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.textContent = "x".repeat(100_001);
    title.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));

    expect(title.textContent).toBe("Original title");
    expect(editor.getStore().pages.home).toEqual({"nav.next": "Kept draft"});
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "field-copy-too-long", level: "error", key: "hero.title"}),
    ]));
    expect(statuses.at(-1)).toMatch(/100,000-character limit|not saved/i);
    await editor.save();
    const persisted = JSON.parse(localStorage.getItem("copyweave:input-limits:v1") ?? "null") as {store?: {pages?: Record<string, Record<string, string>>}} | null;
    expect(persisted?.store?.pages?.home).toEqual({"nav.next": "Kept draft"});
    editor.destroy();
  });

  it("keeps storage provenance visible and labels counts as overrides", async () => {
    const editor = createCopyWeave({siteId: "provenance", pageId: "home", activation: "always", contentUrl: false, saveUrl: false, sessionUrl: false});
    await vi.waitFor(() => {
      const host = Array.from(document.body.children).find((element) => element.shadowRoot);
      expect(host?.shadowRoot?.querySelector("[data-persistence]")?.textContent).toMatch(/source copy|no project file/i);
    });
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.textContent = "Browser-only revision";
    title.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));
    const host = Array.from(document.body.children).find((element) => element.shadowRoot);
    expect(host?.shadowRoot?.querySelector("[data-persistence]")?.textContent).toMatch(/browser draft only/i);
    expect(host?.shadowRoot?.textContent).toContain("Overrides / Editable");
    editor.destroy();
  });

  it("does not treat Enter during IME composition as field completion", () => {
    const editor = createCopyWeave({siteId: "ime", pageId: "home", activation: "always", contentUrl: false, saveUrl: false, sessionUrl: false});
    editor.open();
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.focus();
    const event = new KeyboardEvent("keydown", {key: "Enter", bubbles: true, isComposing: true});
    title.dispatchEvent(event);
    expect(document.activeElement).toBe(title);
    editor.destroy();
  });

  it("rejects content for a different site without overwriting current copy", () => {
    const editor = createCopyWeave({siteId: "right-site", pageId: "home", activation: "manual", contentUrl: false, saveUrl: false, sessionUrl: false});
    const accepted = editor.import(JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "wrong-site",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Wrong"}},
    }));
    expect(accepted).toBe(false);
    expect(document.querySelector('[data-copy-id="hero.title"]')?.textContent).toContain("Original title");
    editor.destroy();
  });

  it("rejects oversized imports before parsing or replacing copy", () => {
    const statuses: string[] = [];
    const editor = createCopyWeave({
      siteId: "limits",
      pageId: "home",
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      onStatus: (message) => statuses.push(message),
    });
    expect(editor.import("x".repeat(2 * 1024 * 1024 + 1))).toBe(false);
    expect(statuses.at(-1)).toMatch(/2 MB/i);
    expect(document.querySelector('[data-copy-id="hero.title"]')?.textContent).toContain("Original title");
    editor.destroy();
  });

  it("reports an export request without claiming the browser completed the download", () => {
    const statuses: string[] = [];
    const editor = createCopyWeave({
      siteId: "export",
      pageId: "home",
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      onStatus: (message) => statuses.push(message),
    });
    editor.export("copyweave-export-test.json");
    expect(statuses.at(-1)).toMatch(/download requested|check downloads/i);
    editor.destroy();
  });

  it("never reports disk success when the save endpoint is unavailable", async () => {
    const statuses: string[] = [];
    const editor = createCopyWeave({
      siteId: "offline",
      pageId: "home",
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      onStatus: (message) => statuses.push(message),
    });
    await expect(editor.save()).resolves.toBe(false);
    expect(statuses.at(-1)).toMatch(/serve|export/i);
    editor.destroy();
  });

  it("never claims a browser draft is safe when localStorage rejects writes", async () => {
    const statuses: string[] = [];
    const storage = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const editor = createCopyWeave({
      siteId: "no-storage",
      pageId: "home",
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      onStatus: (message) => statuses.push(message),
    });

    await expect(editor.save()).resolves.toBe(false);
    expect(statuses.at(-1)).toMatch(/storage is unavailable|export JSON/i);
    expect(statuses.at(-1)).not.toMatch(/draft is safe/i);
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "browser-storage-unavailable", level: "error"}),
    ]));
    editor.destroy();
    storage.mockRestore();
  });

  it("preserves an unreadable browser draft until an explicit save archives it", async () => {
    const raw = "{old invalid draft";
    localStorage.setItem("copyweave:invalid-draft:v1", raw);
    const editor = createCopyWeave({
      siteId: "invalid-draft",
      pageId: "home",
      activation: "always",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      saveDebounceMs: 0,
    });
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.textContent = "New in-memory copy";
    title.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(localStorage.getItem("copyweave:invalid-draft:v1")).toBe(raw);
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "invalid-browser-draft", level: "error"}),
    ]));

    await editor.save();
    const recoveryKey = Array.from({length: localStorage.length}, (_, index) => localStorage.key(index))
      .find((key): key is string => Boolean(key?.startsWith("copyweave:invalid-draft:v1:recovery:")));
    expect(recoveryKey).toBeTruthy();
    expect(localStorage.getItem(recoveryKey!)).toBe(raw);
    const replacement = JSON.parse(localStorage.getItem("copyweave:invalid-draft:v1") ?? "null") as {store?: {pages?: Record<string, Record<string, string>>}};
    expect(replacement.store?.pages?.home?.["hero.title"]).toBe("New in-memory copy");
    editor.destroy();
  });

  it("distinguishes a successful project write from a failed browser-draft write", async () => {
    const statuses: string[] = [];
    const project = {
      format: "copyweave/content",
      version: 1,
      siteId: "disk-only",
      updatedAt: "2026-08-11T00:00:00.000Z",
      pages: {},
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("copyweave.content.json")) return Promise.resolve(new Response(JSON.stringify(project), {status: 200, headers: {ETag: '"base"'}}));
      if (url.endsWith("/__copyweave/session")) return Promise.resolve(new Response(JSON.stringify({token: "token", etag: '"base"', siteId: "disk-only"}), {status: 200}));
      if (init?.method === "PUT") return Promise.resolve(new Response(JSON.stringify({ok: true}), {status: 200, headers: {ETag: '"saved"'}}));
      return Promise.resolve(new Response(null, {status: 404}));
    }));
    const storage = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const editor = createCopyWeave({siteId: "disk-only", pageId: "home", activation: "manual", onStatus: (message) => statuses.push(message)});

    await expect(editor.save()).resolves.toBe(true);
    expect(statuses.at(-1)).toMatch(/saved to the project file/i);
    expect(statuses.at(-1)).toMatch(/browser storage is unavailable/i);
    expect(statuses.at(-1)).not.toMatch(/and this browser/i);
    editor.destroy();
    storage.mockRestore();
    vi.unstubAllGlobals();
  });

  it("warns when siteId is implicit so same-origin projects do not silently share drafts", () => {
    const editor = createCopyWeave({activation: "manual", contentUrl: false, saveUrl: false, sessionUrl: false});
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "implicit-site-id", level: "warning"}),
    ]));
    editor.destroy();
  });

  it("keeps the editor host hidden when activation is manual, including mobile CSS", () => {
    const editor = createCopyWeave({siteId: "hidden", activation: "manual", contentUrl: false, saveUrl: false, sessionUrl: false});
    const panelHost = Array.from(document.body.children).find((element) => element.shadowRoot) as HTMLElement | undefined;
    expect(panelHost?.hidden).toBe(true);
    expect(panelHost?.shadowRoot?.querySelector("style")?.textContent).toContain(":host([hidden])");
    editor.destroy();
  });

  it("re-resolves a functional page ID when an SPA route refreshes", () => {
    let pageId = "home";
    const editor = createCopyWeave({
      siteId: "routes",
      pageId: () => pageId,
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
    });
    expect(editor.import({
      format: "copyweave/content",
      version: 1,
      siteId: "routes",
      updatedAt: new Date().toISOString(),
      pages: {products: {"hero.title": "Products title"}},
    })).toBe(true);

    pageId = "products";
    editor.refresh();
    expect(document.querySelector('[data-copy-id="hero.title"]')?.textContent).toContain("Products title");
    editor.destroy();
  });

  it("keeps source defaults scoped to the current SPA page", () => {
    let pageId = "home";
    const editor = createCopyWeave({
      siteId: "page-defaults",
      pageId: () => pageId,
      activation: "manual",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
    });
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.textContent = "Products source";
    pageId = "products";
    editor.refresh();
    expect(title.textContent).toBe("Products source");
    editor.destroy();
  });

  it("preserves project pages when copy changes before the project finishes loading", async () => {
    let resolveProject!: (value: Response) => void;
    const projectResponse = new Promise<Response>((resolve) => { resolveProject = resolve; });
    let saved: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("copyweave.content.json")) return projectResponse;
      if (url.endsWith("/__copyweave/session")) {
        return Promise.resolve(new Response(JSON.stringify({token: "token", etag: '"project"'}), {
          status: 200,
          headers: {"Content-Type": "application/json"},
        }));
      }
      if (url.endsWith("/__copyweave/save") && init?.method === "PUT") {
        saved = JSON.parse(String(init.body)) as Record<string, unknown>;
        return Promise.resolve(new Response(JSON.stringify({ok: true, diskSaved: true}), {
          status: 200,
          headers: {ETag: '"saved"'},
        }));
      }
      return Promise.resolve(new Response(null, {status: 404}));
    }));

    const editor = createCopyWeave({siteId: "slow", pageId: "home", activation: "always"});
    editor.open();
    const title = document.querySelector<HTMLElement>('[data-copy-id="hero.title"]')!;
    title.textContent = "Typed before load";
    title.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: "Typed before load"}));
    const save = editor.save();

    resolveProject(new Response(JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "slow",
      updatedAt: "2026-08-10T00:00:00.000Z",
      pages: {people: {"people.title": "Kept project page"}},
    }), {status: 200, headers: {"Content-Type": "application/json", ETag: '"project"'}}));

    await expect(save).resolves.toBe(true);
    const pages = saved?.pages as Record<string, Record<string, string>>;
    expect(pages.people?.["people.title"]).toBe("Kept project page");
    expect(pages.home?.["hero.title"]).toBe("Typed before load");
    editor.destroy();
    vi.unstubAllGlobals();
  });

  it("blocks disk save when the project content base could not be loaded", async () => {
    const statuses: string[] = [];
    let putCount = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("copyweave.content.json")) return Promise.resolve(new Response(null, {status: 404}));
      if (url.endsWith("/__copyweave/session")) {
        return Promise.resolve(new Response(JSON.stringify({token: "token", etag: '"current"'}), {
          status: 200,
          headers: {"Content-Type": "application/json"},
        }));
      }
      if (init?.method === "PUT") putCount += 1;
      return Promise.resolve(new Response(null, {status: 500}));
    }));
    const editor = createCopyWeave({siteId: "missing-base", pageId: "home", activation: "manual", onStatus: (message) => statuses.push(message)});

    await expect(editor.save()).resolves.toBe(false);
    expect(putCount).toBe(0);
    expect(statuses.at(-1)).toMatch(/not found|copyweave init|blocked/i);
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "project-load-not-found", level: "error"}),
    ]));
    editor.destroy();
    vi.unstubAllGlobals();
  });

  it("distinguishes an invalid project file from a missing project file", async () => {
    const statuses: string[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("copyweave.content.json")) {
        return Promise.resolve(new Response("not json", {status: 200, headers: {"Content-Type": "application/json"}}));
      }
      if (url.endsWith("/__copyweave/session")) {
        return Promise.resolve(new Response(JSON.stringify({token: "token", etag: '"current"', siteId: "invalid-project"}), {
          status: 200,
          headers: {"Content-Type": "application/json"},
        }));
      }
      return Promise.resolve(new Response(null, {status: 404}));
    }));
    const editor = createCopyWeave({siteId: "invalid-project", pageId: "home", activation: "manual", onStatus: (message) => statuses.push(message)});

    await expect(editor.save()).resolves.toBe(false);
    expect(statuses.at(-1)).toMatch(/not valid CopyWeave JSON|repair/i);
    expect(editor.getDiagnostics()).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "project-load-invalid-json", level: "error"}),
    ]));
    editor.destroy();
    vi.unstubAllGlobals();
  });

  it("describes a stale ETag as reloadable before claiming a same-field conflict", async () => {
    const statuses: string[] = [];
    const project = {
      format: "copyweave/content",
      version: 1,
      siteId: "stale",
      updatedAt: "2026-08-11T00:00:00.000Z",
      pages: {},
    };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("copyweave.content.json")) {
        return Promise.resolve(new Response(JSON.stringify(project), {status: 200, headers: {"Content-Type": "application/json", ETag: '"old"'}}));
      }
      if (url.endsWith("/__copyweave/session")) {
        return Promise.resolve(new Response(JSON.stringify({token: "token", etag: '"old"'}), {status: 200, headers: {"Content-Type": "application/json"}}));
      }
      if (init?.method === "PUT") return Promise.resolve(new Response(null, {status: 412, headers: {ETag: '"new"'}}));
      return Promise.resolve(new Response(null, {status: 404}));
    }));
    const editor = createCopyWeave({siteId: "stale", pageId: "home", activation: "manual", onStatus: (message) => statuses.push(message)});

    await expect(editor.save()).resolves.toBe(false);
    expect(statuses.at(-1)).toMatch(/reload/i);
    expect(statuses.at(-1)).not.toMatch(/same copy/i);
    const host = Array.from(document.body.children).find((element) => element.shadowRoot);
    expect(host?.shadowRoot?.querySelector("[data-persistence]")?.textContent).toMatch(/conflict/i);
    editor.open();
    expect(statuses.at(-1)).toMatch(/reload/i);
    editor.destroy();
    vi.unstubAllGlobals();
  });

  it("renders customized panel messages as text rather than markup", () => {
    const editor = createCopyWeave({
      siteId: "messages",
      activation: "always",
      contentUrl: false,
      saveUrl: false,
      sessionUrl: false,
      messages: {title: '<img src=x onerror="globalThis.injected=true">'},
    });
    const panelHost = Array.from(document.body.children).find((element) => element.shadowRoot);
    expect(panelHost?.shadowRoot?.querySelector("img")).toBeNull();
    expect(panelHost?.shadowRoot?.querySelector("h2")?.textContent).toContain("<img");
    editor.destroy();
  });
});
