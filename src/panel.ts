import type {ResolvedCopyWeaveOptions} from "./types.js";

interface PanelActions {
  onOpen(): void;
  onClose(): void;
  onSave(): void;
  onExport(): void;
  onImport(text: string): void;
  onImportTooLarge(): void;
  onReset(): void;
  onPrevious(): void;
  onNext(): void;
}

export interface PanelHandle {
  host: HTMLDivElement;
  launcher: HTMLButtonElement;
  panel: HTMLElement;
  doneButton: HTMLButtonElement;
  setOpen(open: boolean): void;
  setVisible(visible: boolean): void;
  setStatus(message: string): void;
  setPersistenceState(message: string, tone: "loading" | "source" | "browser" | "project" | "unavailable" | "conflict"): void;
  setPage(name: string): void;
  setCounts(changed: number, total: number): void;
  setResetArmed(armed: boolean): void;
  destroy(): void;
}

export const createPanel = (options: ResolvedCopyWeaveOptions, actions: PanelActions): PanelHandle => {
  const {messages, theme} = options;
  const escapeHtml = (value: string) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const copy = Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, escapeHtml(value)])) as unknown as typeof messages;
  const host = document.createElement("div");
  host.dataset.copyweaveIgnore = "true";
  host.setAttribute("aria-label", "CopyWeave copy editor");
  const shadow = host.attachShadow({mode: "open"});

  shadow.innerHTML = `
    <style>
      :host {
        --accent: ${theme.accent};
        --surface: ${theme.surface};
        --text: ${theme.text};
        --muted: ${theme.muted};
        position: fixed;
        z-index: 2147483000;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      :host([hidden]) { display: none !important; }
      * { box-sizing: border-box; }
      button, label { font: inherit; }
      button { border-radius: 0; }
      .launcher {
        width: 44px;
        min-width: 44px;
        height: 132px;
        padding: 12px 0;
        border: 1px solid color-mix(in srgb, var(--text) 62%, transparent);
        color: white;
        background: var(--accent);
        box-shadow: 0 10px 30px rgb(0 0 0 / .2);
        cursor: pointer;
        font-size: 12px;
        font-weight: 720;
        letter-spacing: .08em;
        writing-mode: vertical-rl;
      }
      .panel {
        width: min(374px, calc(100vw - 24px));
        margin-right: 12px;
        border: 1px solid color-mix(in srgb, var(--text) 46%, transparent);
        color: var(--text);
        background: var(--surface);
        box-shadow: 0 20px 64px rgb(0 0 0 / .3);
      }
      .panel[hidden], .launcher[hidden] { display: none; }
      .head {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 8px;
        padding: 15px;
        border-bottom: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
      }
      .kicker {
        display: block;
        margin-bottom: 5px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 760;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      h2 { margin: 0; font-size: 20px; font-weight: 650; letter-spacing: -.02em; }
      .icon, .done {
        align-self: start;
        min-width: 44px;
        min-height: 44px;
        padding: 0 10px;
        border: 1px solid color-mix(in srgb, var(--text) 42%, transparent);
        color: var(--text);
        background: transparent;
        cursor: pointer;
        font-size: 12px;
      }
      .icon { padding: 0; font-size: 18px; }
      .meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-bottom: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
      }
      .meta div { min-height: 68px; padding: 11px 15px; }
      .meta div + div { border-left: 1px solid color-mix(in srgb, var(--text) 20%, transparent); }
      .meta span { display: block; color: var(--muted); font-size: 12px; letter-spacing: .04em; }
      .meta strong { display: block; margin-top: 10px; font-size: 13px; font-weight: 640; }
      .persistence { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 9px 15px; border-top: 1px solid color-mix(in srgb, var(--text) 20%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--text) 20%, transparent); }
      .persistence span { color: var(--muted); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
      .persistence strong { max-width: 70%; text-align: right; font-size: 12px; line-height: 1.35; }
      .persistence strong[data-tone="browser"] { color: #ffe07a; }
      .persistence strong[data-tone="project"] { color: #9ce7b2; }
      .persistence strong[data-tone="unavailable"], .persistence strong[data-tone="conflict"] { color: #ffb9b0; }
      .help { margin: 0; padding: 13px 15px; color: var(--muted); font-size: 12px; line-height: 1.55; }
      .status {
        min-height: 44px;
        margin: 0 15px 13px;
        padding: 9px 10px;
        border-left: 3px solid var(--accent);
        color: var(--text);
        background: color-mix(in srgb, var(--text) 8%, transparent);
        font-size: 12px;
        line-height: 1.45;
      }
      .navigator, .actions { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid color-mix(in srgb, var(--text) 20%, transparent); }
      .navigator button, .actions button, .actions label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 48px;
        padding: 0 13px;
        border: 0;
        color: var(--text);
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        text-align: left;
      }
      .navigator > * + *, .actions > *:nth-child(even) { border-left: 1px solid color-mix(in srgb, var(--text) 20%, transparent); }
      .actions > *:nth-child(n + 3) { border-top: 1px solid color-mix(in srgb, var(--text) 20%, transparent); }
      .primary { background: var(--accent) !important; color: white !important; }
      .danger { color: #ffb9b0 !important; }
      button:hover, button:focus-visible, label:hover, label:focus-within {
        color: var(--surface) !important;
        background: var(--text) !important;
        outline: none;
      }
      input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .panel.compact .body { display: none; }
      .panel.compact .head { border-bottom: 0; }
      @media (max-width: 720px) {
        :host { display: block; top: auto; right: 8px; left: 8px; bottom: calc(12px + env(safe-area-inset-bottom)); transform: none; }
        .panel { width: min(380px, 100%); max-height: min(72svh, 620px); overflow: auto; margin: 0 0 0 auto; }
        .launcher { display: block; width: auto; min-width: 124px; height: 46px; min-height: 46px; margin-left: auto; padding: 0 15px; writing-mode: horizontal-tb; }
      }
      @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
    </style>
    <button class="launcher" type="button" aria-expanded="false">${copy.launcher}</button>
    <section class="panel" aria-labelledby="copyweave-title" hidden>
      <header class="head">
        <div><span class="kicker">${copy.kicker}</span><h2 id="copyweave-title">${copy.title}</h2></div>
        <button class="icon" type="button" data-minimize aria-label="${copy.minimize}" aria-controls="copyweave-body" aria-expanded="true">−</button>
        <button class="done" type="button">${copy.done}</button>
      </header>
      <div class="body" id="copyweave-body">
        <div class="meta">
          <div><span>${copy.page}</span><strong data-page></strong></div>
          <div><span>${copy.changed} / ${copy.editable}</span><strong><b data-changed>0</b> / <b data-total>0</b></strong></div>
        </div>
        <div class="persistence"><span>${copy.persistence}</span><strong data-persistence data-tone="loading">${copy.stateLoading}</strong></div>
        <p class="help">${copy.help}</p>
        <p class="status" role="status" aria-live="polite" aria-atomic="true">${copy.ready}</p>
        <div class="navigator">
          <button type="button" data-previous>← ${copy.previous}</button>
          <button type="button" data-next>${copy.next} →</button>
        </div>
        <div class="actions">
          <button class="primary" type="button" data-save>${copy.save}<span>Ctrl+S</span></button>
          <button type="button" data-export>${copy.export}<span>↓</span></button>
          <label>${copy.import}<span>↑</span><input type="file" accept="application/json,.json" data-import /></label>
          <button class="danger" type="button" data-reset>${copy.reset}<span>↺</span></button>
        </div>
      </div>
    </section>
  `;

  document.body.append(host);
  const launcher = shadow.querySelector<HTMLButtonElement>(".launcher")!;
  const panel = shadow.querySelector<HTMLElement>(".panel")!;
  const doneButton = shadow.querySelector<HTMLButtonElement>(".done")!;
  const minimize = shadow.querySelector<HTMLButtonElement>("[data-minimize]")!;
  const status = shadow.querySelector<HTMLElement>(".status")!;
  const persistence = shadow.querySelector<HTMLElement>("[data-persistence]")!;
  const page = shadow.querySelector<HTMLElement>("[data-page]")!;
  const changed = shadow.querySelector<HTMLElement>("[data-changed]")!;
  const total = shadow.querySelector<HTMLElement>("[data-total]")!;
  const reset = shadow.querySelector<HTMLButtonElement>("[data-reset]")!;
  const importInput = shadow.querySelector<HTMLInputElement>("[data-import]")!;

  page.textContent = options.pageName;
  launcher.addEventListener("click", actions.onOpen);
  doneButton.addEventListener("click", actions.onClose);
  minimize.addEventListener("click", () => {
    const compact = panel.classList.toggle("compact");
    minimize.textContent = compact ? "+" : "−";
    minimize.setAttribute("aria-label", compact ? messages.expand : messages.minimize);
    minimize.setAttribute("aria-expanded", String(!compact));
  });
  shadow.querySelector("[data-save]")?.addEventListener("click", actions.onSave);
  shadow.querySelector("[data-export]")?.addEventListener("click", actions.onExport);
  shadow.querySelector("[data-previous]")?.addEventListener("click", actions.onPrevious);
  shadow.querySelector("[data-next]")?.addEventListener("click", actions.onNext);
  reset.addEventListener("click", actions.onReset);
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (file && file.size > 2 * 1024 * 1024) actions.onImportTooLarge();
    else if (file) actions.onImport(await file.text());
    importInput.value = "";
  });

  return {
    host,
    launcher,
    panel,
    doneButton,
    setOpen(open) {
      launcher.hidden = open;
      panel.hidden = !open;
      launcher.setAttribute("aria-expanded", String(open));
      if (open) doneButton.focus();
      else launcher.focus();
    },
    setVisible(visible) {
      host.hidden = !visible;
    },
    setStatus(message) {
      status.textContent = message;
    },
    setPersistenceState(message, tone) {
      persistence.textContent = message;
      persistence.dataset.tone = tone;
    },
    setPage(name) {
      page.textContent = name;
    },
    setCounts(changedCount, totalCount) {
      changed.textContent = String(changedCount);
      total.textContent = String(totalCount);
    },
    setResetArmed(armed) {
      reset.innerHTML = armed ? `${copy.resetConfirm}<span>4s</span>` : `${copy.reset}<span>↺</span>`;
    },
    destroy() {
      host.remove();
    },
  };
};
