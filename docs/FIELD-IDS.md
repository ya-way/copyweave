# Field ID design

A field ID is a content address. Treat it like a database key, not a CSS selector.

## The rule

Use semantic, dot-separated IDs on text leaves:

```html
<h1 data-copy-id="home.hero.title">Keep the design.</h1>
<a data-copy-id="global.nav.products" href="/products">Products</a>
```

Good IDs answer three questions: where is it, what role does it play, and will the answer survive a visual refactor?

## Recommended grammar

```text
<scope>.<section>.<role>[.<variant>]
```

- Scope: `global`, `home`, `people`, `products`.
- Section: `nav`, `hero`, `proof`, `cta`, `footer`.
- Role: `eyebrow`, `title`, `body`, `label`, `note`.
- Variant: stable meaning such as `primary`; never DOM position such as `left` or `third`.

Examples:

```text
global.nav.home
home.hero.title
home.hero.summary
products.atlas.description
global.footer.contact
```

## Avoid

```text
text-12
div-3-p-1
left-card-title
blue-button
auto:main:2:0
```

These encode implementation or layout. Automatic `auto:` IDs are valid for discovery and migration, but should not become committed production keys.

## Leaf fields

Prefer this:

```html
<p>
  <span data-copy-id="proof.number">48</span>
  <span data-copy-id="proof.unit">hours</span>
</p>
```

Not this:

```html
<p data-copy-id="proof.statement"><strong>48</strong> hours</p>
```

CopyWeave edits plain text. A field that owns nested markup creates ambiguity about which formatting should survive a replacement. The doctor reports nested explicit fields.

## Repeated components

Use a stable domain key, not the current array index:

```text
products.atlas.title
products.relay.title
```

If no durable domain key exists, introduce one in data before assigning copy IDs. Reordering items then leaves content attached to meaning.

## Renaming and deletion

Renaming an ID is a migration:

1. Copy the value from the old key to the new key in `copyweave.content.json`.
2. Change the markup.
3. Run `copyweave doctor --strict`.
4. Remove the old key only after checking every page and locale branch.

Deletion should be deliberate. Unknown JSON keys are kept so a temporarily absent route does not erase content.

## AI-agent guidance

An agent should inventory visible copy, propose IDs, and show the mapping before a broad write. It must preserve current text as source defaults and must not add IDs to SVG paths, generated CSS content, form values, secrets, code samples, or functional labels that require a different data model.

