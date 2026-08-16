# Field ID rules

Use `<scope>.<section>.<role>[.<variant>]`:

```text
global.nav.products
home.hero.title
home.hero.summary
products.atlas.description
global.footer.contact
```

IDs describe meaning, not implementation. Avoid element names, position, styling, array indices, hashes, and copy snippets.

The accepted semantic field grammar is
`^[A-Za-z0-9][A-Za-z0-9._:-]{0,239}$`. Site and page IDs also have a
240-character ceiling and cannot contain ASCII control characters. For all
store-key roles, `__proto__`, `prototype`, and `constructor` are invalid.
Do not work around a rejection by changing only the JSON: browser discovery,
runtime normalization, CLI validation, and the public schema intentionally use
the same safety contract. Ordinary names such as `toString` are allowed and are
handled as own properties.

Prefer:

```html
<span data-copy-id="proof.number">48</span>
<span data-copy-id="proof.unit">hours</span>
```

Avoid a field around nested markup:

```html
<p data-copy-id="proof.line"><strong>48</strong> hours</p>
```

For repeated items, use a durable domain key such as `products.atlas.title`. If no stable key exists, establish one in the data model before assigning copy IDs.

Treat renaming an ID as a data migration: copy the JSON value, change markup, run strict doctor, then remove the old key after all routes are checked.

Automatic `auto:` IDs are discovery diagnostics. Never present them as refactor-safe project keys.

Capacity is also part of the address contract: one store supports at most 100
pages and 5,000 fields in total. If a model would exceed that, stop and redesign
the content grouping rather than truncating fields or silently dropping copy.
