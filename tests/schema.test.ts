import {describe, expect, it} from "vitest";
import {blankStore, cloneStore, mergeStores, newerStore, normalizeStore, storesHaveSamePages} from "../src/schema";

describe("CopyWeave content schema", () => {
  it("normalizes a safe, versioned store", () => {
    const store = normalizeStore({
      format: "copyweave/content",
      version: 1,
      siteId: "demo",
      updatedAt: "2026-08-11T00:00:00.000Z",
      pages: {home: {"hero.title": "Human words"}},
    }, "demo");

    expect(store?.pages.home?.["hero.title"]).toBe("Human words");
    expect(Object.getPrototypeOf(store?.pages)).toBeNull();
  });

  it("rejects a different site, dangerous keys, invalid timestamps, and oversized copy", () => {
    const valid = blankStore("one");
    expect(normalizeStore(valid, "two")).toBeNull();
    expect(normalizeStore({...valid, siteId: "constructor"})).toBeNull();
    expect(normalizeStore({...valid, updatedAt: "not-a-date"})).toBeNull();
    expect(normalizeStore({...valid, updatedAt: "2021-02-29T00:00:00Z"})).toBeNull();
    expect(normalizeStore({...valid, pages: {constructor: {field: "no"}}})).toBeNull();
    expect(normalizeStore({...valid, pages: {home: {constructor: "no"}}})).toBeNull();
    expect(normalizeStore({...valid, pages: {home: {"bad field": "no"}}})).toBeNull();
    expect(normalizeStore({...valid, pages: {home: {field: "x".repeat(100_001)}}})).toBeNull();
    expect(normalizeStore({...valid, pages: {home: {field: "😀".repeat(100_000)}}})).not.toBeNull();
    expect(normalizeStore({...valid, pages: {home: {field: "😀".repeat(100_001)}}})).toBeNull();
  });

  it("returns isolated clones and chooses the newer timestamp", () => {
    const older = blankStore("demo");
    const newer = {...blankStore("demo"), updatedAt: "2026-08-11T00:00:00.000Z"};
    expect(newerStore(older, newer)).toBe(newer);
    const copy = cloneStore(newer);
    copy.pages.home = {title: "changed"};
    expect(newer.pages.home).toBeUndefined();
    expect(() => cloneStore({...newer, pages: {home: {field: "x".repeat(100_001)}}})).toThrow(/invalid CopyWeave store/i);
  });

  it("three-way merges independent fields and reports same-field conflicts", () => {
    const base = {...blankStore("demo"), pages: {home: {title: "Base", body: "Base body"}}};
    const browser = {...blankStore("demo"), updatedAt: "2026-08-11T01:00:00.000Z", pages: {home: {title: "Browser", body: "Base body"}}};
    const project = {...blankStore("demo"), updatedAt: "2026-08-11T02:00:00.000Z", pages: {home: {title: "Project", body: "Project body"}, people: {title: "People"}}};
    const result = mergeStores(base, browser, project);

    expect(result.store.pages.home?.body).toBe("Project body");
    expect(result.store.pages.people?.title).toBe("People");
    expect(result.store.pages.home?.title).toBe("Browser");
    expect(result.conflicts).toEqual([expect.objectContaining({pageId: "home", fieldId: "title"})]);
  });

  it("compares page content independently of JSON object insertion order", () => {
    const left = {...blankStore("demo"), pages: {home: {title: "Same", body: "Copy"}, people: {title: "People"}}};
    const right = {...blankStore("demo"), pages: {people: {title: "People"}, home: {body: "Copy", title: "Same"}}};
    expect(storesHaveSamePages(left, right)).toBe(true);
    right.pages.home.title = "Different";
    expect(storesHaveSamePages(left, right)).toBe(false);
  });
});
