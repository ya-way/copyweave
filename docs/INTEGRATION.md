# Integration patterns

CopyWeave is deliberately a small browser layer, not a framework. The durable contract is the HTML attribute `data-copy-id`; everything else can be replaced.

## Choose the narrowest mode

| Situation | Mode | Why |
|---|---|---|
| Production site with known copy | `explicit` | Stable IDs and an auditable field list. |
| Existing site being inventoried | `hybrid` | Explicit fields stay stable; uncovered leaf text is visible as `auto:` diagnostics. |
| Throwaway evaluation | `auto` | Fast proof of concept; do not treat generated keys as durable data. |

## Static HTML

Choose and set a stable, project-specific `siteId` before the first editing session. It namespaces browser drafts and must exactly match `copyweave.content.json`; relying on the hostname fallback produces an `implicit-site-id` warning and can collide with another project on the same origin.

Mark leaf text and include the IIFE after the page:

```html
<body data-copy-page="home">
  <h1 data-copy-id="home.hero.title">Current headline</h1>
  <script src="./copyweave.iife.js"></script>
  <script>
    window.copyEditor = CopyWeave.createCopyWeave({
      siteId: "example-site",
      mode: "explicit",
      activation: "query"
    });
  </script>
</body>
```

Create and serve the project file:

```bash
npx copyweave init . --site-id example-site
npx copyweave serve .
```

To bake committed copy into static HTML before deployment:

```bash
npx copyweave apply . --dry-run
npx copyweave apply .
```

`apply` is intentionally conservative: explicit leaf fields only, a backup by default, no JSX/template rewriting.

Backups can contain copy that was intentionally removed. Treat `*.backup` as local recovery data: do not commit or deploy it. CopyWeave's local server refuses to return backup extensions as static files.

## Vite

Install `copyweave`, mount it in the client entry, and put `copyweave.content.json` in `public/`.

```ts
import {createCopyWeave} from "copyweave";

export const copyEditor = createCopyWeave({
  siteId: "example-site",
  pageId: () => document.body.dataset.copyPage ?? location.pathname,
  mode: "explicit",
  activation: import.meta.env.DEV ? "query" : "manual",
});
```

Build normally, then serve the output while writing to the source-controlled public file:

```bash
npm run build
npx copyweave serve dist --content ../public/copyweave.content.json
```

The browser loads `/copyweave.content.json` from the served root while saves target the explicitly supplied file.

## React, Vue, and Svelte SPAs

Mount once after hydration. Call `refresh()` only after route content has settled.

```ts
const editor = createCopyWeave({
  siteId: "example-site",
  pageId: () => routeToCopyPage(location.pathname),
  mode: "explicit",
  activation: "query",
});

router.afterEach(() => queueMicrotask(() => editor.refresh()));
```

Keep the controller outside component render cycles. Destroy it only when the application itself unmounts. Do not make framework state and `contenteditable` fight over the same live text node; explicit leaf fields and a refresh after the framework commits are the safest pattern.

The local CLI is a static server, not an SPA router. Test a direct reload on every editing route. Configure the real host's history fallback, or add a generated route entry such as `products/index.html`; do not report a route as editable when only client-side navigation reaches it.

## Astro and other partial-hydration sites

Load the editor from a single client island or page script. Put IDs in rendered HTML, not only component names. If navigation swaps the document without a full reload, refresh after the swap event.

## Multiple pages

Use one stable `siteId` and one stable `pageId` per route:

```html
<body data-copy-page="products">
```

Page IDs are JSON object keys. Renaming one is a content migration, not a cosmetic refactor.

## Editing must not leak into production

The default `activation: "query"` exposes only a small launcher when `?copyweave` is present. For public production bundles, use `manual` and expose the controller only through a private development entry, or exclude the package entirely from the production build.

CopyWeave provides local workflow safeguards, not authentication. Never treat a query parameter as access control.

Serve only a trusted, secret-free build output. Same-origin application or third-party code can request the local session capability; the CLI does not sandbox the website being edited.

## Content rendering and SEO

Runtime JSON is applied after JavaScript starts. If crawlers, no-JS clients, or first paint must contain final copy, integrate the JSON into the framework build or run `copyweave apply` on static output. CopyWeave does not claim to solve server-side content rendering in version 0.1.

## Safe removal

`controller.destroy()` removes current runtime listeners, fields, styles, and panel state. It does **not** copy approved JSON overrides into your source code and it does not uninstall the package.

Use this order:

1. Fold final overrides into framework components/templates, or run `copyweave apply` against conservative leaf-only static HTML.
2. Build the site and verify the ordinary URL with no activation query. Confirm final text survives with the CopyWeave import/script and JSON request absent.
3. Remove the controller mount and development serve command.
4. Run `npm uninstall copyweave`, or delete the vendored IIFE.
5. Remove content JSON, localStorage drafts, and `.backup` files only after the source-only output has passed review.

Keep a recoverable copy of the JSON until the final source commit or release artifact is verified. Removing the runtime first can make approved words disappear on the next build.

## Verification

Run these before handing editing to a writer:

```bash
npx copyweave doctor dist --strict
npm run build
npx copyweave serve dist --content ../public/copyweave.content.json
```

Then exercise normal mode, edit mode, refresh, disk save, a stale second tab, keyboard-only use, mobile width, and an IME composition. Use the checklist in [USABILITY.md](./USABILITY.md).
