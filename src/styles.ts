export const globalStyles = `
copyweave-field {
  display: contents;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}

html[data-copyweave-editing] copyweave-field,
html[data-copyweave-editing] [data-copyweave-field] {
  outline: 1px dashed color-mix(in srgb, var(--copyweave-accent, #5b5bd6) 62%, transparent);
  outline-offset: 3px;
  cursor: text;
  transition: outline-color 140ms ease, background-color 140ms ease;
}

html[data-copyweave-editing] copyweave-field {
  display: inline;
}

html[data-copyweave-editing] copyweave-field:hover,
html[data-copyweave-editing] [data-copyweave-field]:hover {
  background: color-mix(in srgb, var(--copyweave-accent, #5b5bd6) 10%, transparent);
  outline-color: var(--copyweave-accent, #5b5bd6);
}

html[data-copyweave-editing] copyweave-field:focus,
html[data-copyweave-editing] [data-copyweave-field]:focus {
  background: color-mix(in srgb, var(--copyweave-accent, #5b5bd6) 14%, transparent);
  outline: 2px solid var(--copyweave-accent, #5b5bd6);
  outline-offset: 4px;
}

html[data-copyweave-editing] copyweave-field:empty,
html[data-copyweave-editing] [data-copyweave-field]:empty {
  display: inline-block;
  min-width: 5ch;
  min-height: 1em;
}

html[data-copyweave-editing] copyweave-field:empty::before,
html[data-copyweave-editing] [data-copyweave-field]:empty::before {
  content: attr(data-copyweave-placeholder);
  opacity: .48;
}

html[data-copyweave-editing] a:has(copyweave-field),
html[data-copyweave-editing] button:has(copyweave-field),
html[data-copyweave-editing] a[data-copyweave-field],
html[data-copyweave-editing] button[data-copyweave-field] {
  cursor: text;
}

@media (prefers-reduced-motion: reduce) {
  html[data-copyweave-editing] copyweave-field,
  html[data-copyweave-editing] [data-copyweave-field] {
    transition: none;
  }
}
`;

export const installGlobalStyles = () => {
  const existing = document.querySelector<HTMLStyleElement>("style[data-copyweave-styles]");
  if (existing) return {element: existing, owned: false};
  const element = document.createElement("style");
  element.dataset.copyweaveStyles = "true";
  element.textContent = globalStyles;
  document.head.append(element);
  return {element, owned: true};
};
