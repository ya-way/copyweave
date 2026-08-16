import {getMessages} from "./messages.js";
import {isSafeStoreKey} from "./schema.js";
import type {CopyWeaveOptions, ResolvedCopyWeaveOptions} from "./types.js";

const DEFAULT_EXCLUDE = [
  "script",
  "style",
  "noscript",
  "svg",
  "video",
  "audio",
  "source",
  "picture",
  "iframe",
  "canvas",
  "template",
  "input",
  "textarea",
  "select",
  "option",
  "code",
  "pre",
  "[contenteditable]",
  "[data-copyweave-ignore]",
].join(",");

const normalizePathPage = () => {
  const path = globalThis.location?.pathname || "/";
  return path.replace(/\/index\.html$/i, "/") || "/";
};

const resolveRoot = (root: CopyWeaveOptions["root"]): ParentNode => {
  if (typeof root === "string") {
    const match = document.querySelector(root);
    if (!match) throw new Error(`CopyWeave root selector did not match: ${root}`);
    return match;
  }
  return root ?? document.body;
};

const safeColor = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  try {
    return CSS.supports("color", value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const checkedStoreKey = (kind: "siteId" | "pageId", value: string) => {
  if (!isSafeStoreKey(value)) throw new Error(`Invalid CopyWeave ${kind}: ${value || "(empty)"}`);
  return value;
};

export const resolveOptions = (options: CopyWeaveOptions = {}): ResolvedCopyWeaveOptions => {
  const locale = options.locale ?? (document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh-CN" : "en");
  const rawSiteId = options.siteId ?? document.documentElement.dataset.copyweaveSite ?? globalThis.location?.hostname ?? "site";
  const siteId = checkedStoreKey("siteId", rawSiteId || "site");
  const pageIdOption = options.pageId;
  const resolvePageId = typeof pageIdOption === "function"
    ? () => checkedStoreKey("pageId", pageIdOption() || normalizePathPage())
    : () => checkedStoreKey("pageId", pageIdOption ?? document.body.dataset.copyPage ?? normalizePathPage());
  const pageId = resolvePageId();
  const resolvePageName = options.pageName ? () => options.pageName! : (nextPageId: string) => nextPageId;
  const messages = {...getMessages(locale), ...options.messages};

  return {
    root: resolveRoot(options.root),
    siteId,
    pageId,
    pageName: resolvePageName(pageId),
    resolvePageId,
    resolvePageName,
    mode: options.mode ?? "hybrid",
    activation: options.activation ?? "query",
    activationQuery: options.activationQuery ?? "copyweave",
    contentUrl: options.contentUrl === undefined ? "/copyweave.content.json" : options.contentUrl,
    saveUrl: options.saveUrl === undefined ? "/__copyweave/save" : options.saveUrl,
    sessionUrl: options.sessionUrl === undefined ? "/__copyweave/session" : options.sessionUrl,
    storageKey: options.storageKey ?? `copyweave:${siteId}:v1`,
    idAttribute: options.idAttribute ?? "data-copy-id",
    ignoreAttribute: options.ignoreAttribute ?? "data-copyweave-ignore",
    exclude: options.exclude ? `${DEFAULT_EXCLUDE},${options.exclude}` : DEFAULT_EXCLUDE,
    locale,
    messages,
    theme: {
      accent: safeColor(options.theme?.accent, "#5b5bd6"),
      surface: safeColor(options.theme?.surface, "#171719"),
      text: safeColor(options.theme?.text, "#f7f5ef"),
      muted: safeColor(options.theme?.muted, "#a4a1aa"),
    },
    saveDebounceMs: options.saveDebounceMs ?? 220,
    ...(options.onStatus ? {onStatus: options.onStatus} : {}),
    ...(options.onSave ? {onSave: options.onSave} : {}),
  };
};
