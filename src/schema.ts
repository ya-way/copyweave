import type {CopyPage, CopyStore} from "./types.js";

export const BLOCKED_STORE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
export const MAX_PAGES = 100;
export const MAX_FIELDS = 5000;
export const MAX_KEY_LENGTH = 240;
export const MAX_COPY_LENGTH = 100_000;
const unicodeLength = (value: string) => Array.from(value).length;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isSafeStoreKey = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && unicodeLength(value) <= MAX_KEY_LENGTH
  && !BLOCKED_STORE_KEYS.has(value)
  && !/[\u0000-\u001f\u007f]/.test(value);

const semanticFieldKey = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,239}$/;
export const isSafeFieldKey = (value: unknown): boolean =>
  isSafeStoreKey(value) && (semanticFieldKey.test(value) || value.startsWith("auto:"));

export const isSafeTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = Number(match[7] ?? "0");
  const offsetMinute = Number(match[8] ?? "0");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12
    && day >= 1 && day <= days[month - 1]!
    && hour <= 23 && minute <= 59 && second <= 59
    && offsetHour <= 23 && offsetMinute <= 59;
};

export const blankPage = (): CopyPage => Object.create(null) as CopyPage;

export const blankStore = (siteId: string): CopyStore => {
  if (!isSafeStoreKey(siteId)) throw new Error(`Invalid CopyWeave siteId: ${siteId || "(empty)"}`);
  return {
    format: "copyweave/content",
    version: 1,
    siteId,
    updatedAt: new Date(0).toISOString(),
    pages: Object.create(null) as Record<string, CopyPage>,
  };
};

export const normalizeStore = (value: unknown, expectedSiteId?: string): CopyStore | null => {
  if (!isRecord(value)) return null;
  if (value.format !== "copyweave/content" || value.version !== 1) return null;
  if (!isSafeStoreKey(value.siteId)) return null;
  if (expectedSiteId && value.siteId !== expectedSiteId) return null;
  if (!isSafeTimestamp(value.updatedAt)) return null;
  if (!isRecord(value.pages)) return null;

  const rawPages = Object.entries(value.pages);
  if (rawPages.length > MAX_PAGES) return null;

  let fieldCount = 0;
  const pages: Record<string, CopyPage> = Object.create(null) as Record<string, CopyPage>;
  for (const [pageId, rawPage] of rawPages) {
    if (!isSafeStoreKey(pageId) || !isRecord(rawPage)) return null;
    const page = blankPage();
    for (const [fieldId, copy] of Object.entries(rawPage)) {
      fieldCount += 1;
      if (fieldCount > MAX_FIELDS) return null;
      if (!isSafeFieldKey(fieldId) || typeof copy !== "string" || unicodeLength(copy) > MAX_COPY_LENGTH) return null;
      page[fieldId] = copy;
    }
    pages[pageId] = page;
  }

  return {
    format: "copyweave/content",
    version: 1,
    siteId: value.siteId,
    updatedAt: value.updatedAt,
    pages,
  };
};

export const cloneStore = (store: CopyStore): CopyStore => {
  const cloned = normalizeStore(JSON.parse(JSON.stringify(store)) as unknown, store.siteId);
  if (!cloned) throw new Error("Cannot clone an invalid CopyWeave store.");
  return cloned;
};

export const countStoredFields = (store: CopyStore) =>
  Object.values(store.pages).reduce((total, page) => total + Object.keys(page).length, 0);

export const newerStore = (left: CopyStore, right: CopyStore): CopyStore =>
  Date.parse(right.updatedAt) > Date.parse(left.updatedAt) ? right : left;

export interface CopyMergeConflict {
  pageId: string;
  fieldId: string;
  base: string | undefined;
  browser: string | undefined;
  project: string | undefined;
}

const ownPage = (store: CopyStore, pageId: string) =>
  Object.hasOwn(store.pages, pageId) ? store.pages[pageId] : undefined;

const storeValue = (store: CopyStore, pageId: string, fieldId: string) => {
  const page = ownPage(store, pageId);
  return page && Object.hasOwn(page, fieldId) ? page[fieldId] : undefined;
};

export const mergeStores = (base: CopyStore, browser: CopyStore, project: CopyStore) => {
  const merged = blankStore(project.siteId);
  const conflicts: CopyMergeConflict[] = [];
  const pageIds = new Set([...Object.keys(base.pages), ...Object.keys(browser.pages), ...Object.keys(project.pages)]);

  for (const pageId of pageIds) {
    const fieldIds = new Set([
      ...Object.keys(ownPage(base, pageId) ?? {}),
      ...Object.keys(ownPage(browser, pageId) ?? {}),
      ...Object.keys(ownPage(project, pageId) ?? {}),
    ]);
    const page = blankPage();
    for (const fieldId of fieldIds) {
      const baseValue = storeValue(base, pageId, fieldId);
      const browserValue = storeValue(browser, pageId, fieldId);
      const projectValue = storeValue(project, pageId, fieldId);
      const browserChanged = browserValue !== baseValue;
      const projectChanged = projectValue !== baseValue;
      let value: string | undefined;

      if (browserChanged && projectChanged && browserValue !== projectValue) {
        conflicts.push({pageId, fieldId, base: baseValue, browser: browserValue, project: projectValue});
        value = browserValue;
      } else if (browserChanged) value = browserValue;
      else value = projectValue;

      if (value !== undefined) page[fieldId] = value;
    }
    if (Object.keys(page).length) merged.pages[pageId] = page;
  }

  merged.updatedAt = new Date(Math.max(Date.parse(browser.updatedAt), Date.parse(project.updatedAt))).toISOString();
  return {store: merged, conflicts};
};

export const storesHaveSamePages = (left: CopyStore, right: CopyStore) => {
  const pageIds = Object.keys(left.pages);
  if (pageIds.length !== Object.keys(right.pages).length) return false;
  return pageIds.every((pageId) => {
    const leftPage = ownPage(left, pageId);
    const rightPage = ownPage(right, pageId);
    if (!leftPage || !rightPage) return false;
    const fieldIds = Object.keys(leftPage);
    return fieldIds.length === Object.keys(rightPage).length
      && fieldIds.every((fieldId) => Object.hasOwn(rightPage, fieldId) && leftPage[fieldId] === rightPage[fieldId]);
  });
};

export const countOverrides = (store: CopyStore, pageId: string) =>
  Object.keys(ownPage(store, pageId) ?? {}).length;
