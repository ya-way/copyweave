export type CopyPage = Record<string, string>;

export interface CopyStore {
  format: "copyweave/content";
  version: 1;
  siteId: string;
  updatedAt: string;
  pages: Record<string, CopyPage>;
}

export type CopyWeaveLocale = "en" | "zh-CN";
export type CopyWeaveMode = "auto" | "explicit" | "hybrid";
export type CopyWeaveActivation = "always" | "query" | "manual";

export interface CopyWeaveMessages {
  launcher: string;
  title: string;
  kicker: string;
  done: string;
  page: string;
  changed: string;
  editable: string;
  persistence: string;
  stateLoading: string;
  stateSourceOnly: string;
  stateBrowserDraft: string;
  stateProjectSynced: string;
  stateProjectUnavailable: string;
  stateStorageUnavailable: string;
  stateInvalidDraft: string;
  stateConflict: string;
  help: string;
  ready: string;
  editing: string;
  save: string;
  export: string;
  exportRequested: string;
  exportRequestedNoBrowser: string;
  import: string;
  reset: string;
  resetConfirm: string;
  resetArmed: string;
  previous: string;
  next: string;
  minimize: string;
  expand: string;
  restored: string;
  saving: string;
  savedProject: string;
  savedProjectNoBrowser: string;
  savedBrowser: string;
  saveUnavailable: string;
  projectUnavailable: string;
  projectNotFound: string;
  projectInvalid: string;
  projectSiteMismatch: string;
  projectLoadFailed: string;
  saveSessionInvalid: string;
  saveRejected: string;
  saveWriteFailed: string;
  saveNetworkFailed: string;
  staleProject: string;
  conflict: string;
  importSuccess: string;
  importInvalid: string;
  importTooLarge: string;
  storageUnavailable: string;
  invalidBrowserDraft: string;
  invalidBrowserDraftExported: string;
  copyTooLong: string;
  contentLimitReached: string;
  emptyPlaceholder: string;
}

export interface CopyWeaveTheme {
  accent?: string;
  surface?: string;
  text?: string;
  muted?: string;
}

export interface CopyWeaveOptions {
  root?: ParentNode | string;
  siteId?: string;
  pageId?: string | (() => string);
  pageName?: string;
  mode?: CopyWeaveMode;
  activation?: CopyWeaveActivation;
  activationQuery?: string;
  contentUrl?: string | false;
  saveUrl?: string | false;
  sessionUrl?: string | false;
  storageKey?: string;
  idAttribute?: string;
  ignoreAttribute?: string;
  exclude?: string;
  locale?: CopyWeaveLocale;
  messages?: Partial<CopyWeaveMessages>;
  theme?: CopyWeaveTheme;
  saveDebounceMs?: number;
  onStatus?: (message: string) => void;
  onSave?: (store: CopyStore) => void;
}

export interface CopyWeaveDiagnostic {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
  key?: string;
}

export interface CopyWeaveController {
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
  save(): Promise<boolean>;
  export(filename?: string): void;
  import(input: string | CopyStore): boolean;
  resetPage(): void;
  getStore(): CopyStore;
  getDiagnostics(): CopyWeaveDiagnostic[];
  destroy(): void;
}

export interface ResolvedCopyWeaveOptions {
  root: ParentNode;
  siteId: string;
  pageId: string;
  pageName: string;
  resolvePageId: () => string;
  resolvePageName: (pageId: string) => string;
  mode: CopyWeaveMode;
  activation: CopyWeaveActivation;
  activationQuery: string;
  contentUrl: string | false;
  saveUrl: string | false;
  sessionUrl: string | false;
  storageKey: string;
  idAttribute: string;
  ignoreAttribute: string;
  exclude: string;
  locale: CopyWeaveLocale;
  messages: CopyWeaveMessages;
  theme: Required<CopyWeaveTheme>;
  saveDebounceMs: number;
  onStatus?: (message: string) => void;
  onSave?: (store: CopyStore) => void;
}
