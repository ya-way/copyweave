import {beforeEach, describe, expect, it} from "vitest";
import {discoverFields} from "../src/fields";

const options = () => ({
  root: document.body,
  mode: "hybrid" as const,
  idAttribute: "data-copy-id",
  ignoreAttribute: "data-copyweave-ignore",
  exclude: "script,style,svg,[hidden],[data-copyweave-ignore]",
});

describe("field discovery", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("uses semantic IDs and keeps them stable after neighboring DOM changes", () => {
    document.body.innerHTML = '<main><h1 data-copy-id="hero.title">Original</h1></main>';
    const first = discoverFields(options());
    expect([...first.fields.keys()]).toContain("hero.title");
    first.fields.get("hero.title")?.write("Edited");
    first.fields.forEach((field) => field.destroy());

    document.querySelector("main")?.insertAdjacentHTML("afterbegin", "<p>New neighbor</p>");
    const second = discoverFields(options());
    expect(second.fields.get("hero.title")?.read()).toBe("Edited");
    expect(second.fields.get("hero.title")?.direct).toBe(true);
  });

  it("reports duplicates and nested explicit fields", () => {
    document.body.innerHTML = `
      <p data-copy-id="same">One</p>
      <p data-copy-id="same">Two</p>
      <h2 data-copy-id="complex">Hello <em>world</em></h2>
      <p data-copy-id="complex">Duplicate base ID</p>
    `;
    const result = discoverFields(options());
    expect(result.diagnostics.filter((item) => item.code === "duplicate-field-id")).toHaveLength(2);
    expect(result.diagnostics.some((item) => item.code === "complex-explicit-field")).toBe(true);
  });

  it("rejects dangerous and malformed explicit IDs instead of creating unsaveable fields", () => {
    document.body.innerHTML = `
      <p data-copy-id="constructor">Dangerous</p>
      <p data-copy-id="bad field">Malformed</p>
    `;
    const result = discoverFields(options());
    expect(result.fields.size).toBe(0);
    expect(result.diagnostics.filter((item) => item.code === "invalid-field-id")).toHaveLength(2);
  });

  it("skips hidden, ignored, scripted, and SVG copy", () => {
    document.body.innerHTML = `
      <p>Visible automatic copy</p>
      <p hidden>Hidden copy</p>
      <p data-copyweave-ignore>Ignored copy</p>
      <script>const secret = "not copy";</script>
      <svg><text>Vector copy</text></svg>
    `;
    const result = discoverFields(options());
    expect(result.fields.size).toBe(1);
    expect([...result.fields.values()][0]?.read()).toBe("Visible automatic copy");
  });

  it("excludes explicitly marked code, SVG, and caller-excluded subtrees", () => {
    document.body.innerHTML = `
      <code data-copy-id="code.sample">const privateValue = 1</code>
      <svg><text data-copy-id="vector.label">Vector label</text></svg>
      <section class="functional"><p data-copy-id="status.label">Generated status</p></section>
    `;
    const result = discoverFields({...options(), exclude: `${options().exclude},code,.functional`});
    expect(result.fields.size).toBe(0);
  });

  it("keeps a declared leaf ID when a nested synthetic ID would collide in either DOM order", () => {
    for (const html of [
      '<p data-copy-id="feature.0">Declared first</p><h2 data-copy-id="feature">Nested <em>copy</em></h2>',
      '<h2 data-copy-id="feature">Nested <em>copy</em></h2><p data-copy-id="feature.0">Declared last</p>',
    ]) {
      document.body.innerHTML = html;
      const result = discoverFields(options());
      expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({code: "duplicate-field-id", key: "feature.0"}),
      ]));
      const declared = result.fields.get("feature.0");
      expect(declared?.direct).toBe(true);
      expect(declared?.element.matches('[data-copy-id="feature.0"]')).toBe(true);
    }
  });
});
