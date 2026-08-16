import type {CopyWeaveDiagnostic, CopyWeaveMode} from "./types.js";
import {isSafeFieldKey} from "./schema.js";

export interface FieldBinding {
  key: string;
  element: HTMLElement;
  defaultValue: string;
  direct: boolean;
  read(): string;
  write(value: string): void;
  setEditing(enabled: boolean, placeholder: string): void;
  destroy(): void;
}

export interface DiscoverOptions {
  root: ParentNode;
  mode: CopyWeaveMode;
  idAttribute: string;
  ignoreAttribute: string;
  exclude: string;
}

const splitWhitespace = (raw: string) => {
  const prefix = raw.match(/^\s*/)?.[0] ?? "";
  const suffix = raw.match(/\s*$/)?.[0] ?? "";
  const end = raw.length - suffix.length;
  return {prefix, value: raw.slice(prefix.length, end), suffix};
};

const isHidden = (element: Element) => {
  if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return true;
  try {
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse";
  } catch {
    return false;
  }
};

const shouldSkip = (node: Text, options: DiscoverOptions) => {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue?.trim()) return true;
  if (parent.closest(options.exclude)) return true;
  if (parent.closest(`[${options.ignoreAttribute}]`)) return true;
  return isHidden(parent);
};

const elementSegment = (element: Element) => {
  if (element.id) return `${element.tagName.toLowerCase()}#${encodeURIComponent(element.id)}`;
  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();
  const peers = Array.from(parent.children).filter((peer) => peer.tagName === element.tagName);
  return `${element.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(element) + 1})`;
};

const automaticKey = (node: Text, root: ParentNode) => {
  const parent = node.parentElement;
  if (!parent) return "auto:unknown";
  const segments: string[] = [];
  let current: Element | null = parent;
  while (current && current !== root) {
    segments.push(elementSegment(current));
    current = current.parentElement;
  }
  const textIndex = Array.from(parent.childNodes)
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .indexOf(node);
  return `auto:${segments.reverse().join(">")}:text(${textIndex})`;
};

const rememberAttribute = (element: HTMLElement, name: string) => ({
  present: element.hasAttribute(name),
  value: element.getAttribute(name),
});

const restoreAttribute = (
  element: HTMLElement,
  name: string,
  snapshot: {present: boolean; value: string | null},
) => {
  if (!snapshot.present) element.removeAttribute(name);
  else if (snapshot.value === null) element.setAttribute(name, "");
  else element.setAttribute(name, snapshot.value);
};

const directBinding = (element: HTMLElement, key: string): FieldBinding => {
  const source = splitWhitespace(element.textContent ?? "");
  const snapshots = {
    contenteditable: rememberAttribute(element, "contenteditable"),
    role: rememberAttribute(element, "role"),
    label: rememberAttribute(element, "aria-label"),
    spellcheck: rememberAttribute(element, "spellcheck"),
  };

  return {
    key,
    element,
    defaultValue: source.value,
    direct: true,
    read: () => (element.textContent ?? "").trim(),
    write: (value) => {
      element.textContent = `${source.prefix}${value}${source.suffix}`;
    },
    setEditing: (enabled, placeholder) => {
      if (enabled) {
        element.dataset.copyweaveField = key;
        element.dataset.copyweavePlaceholder = placeholder;
        element.setAttribute("contenteditable", "plaintext-only");
        element.setAttribute("role", "textbox");
        element.setAttribute("aria-label", `${key}: ${(element.textContent ?? "").trim().slice(0, 60)}`);
        element.setAttribute("spellcheck", "true");
      } else {
        delete element.dataset.copyweaveField;
        delete element.dataset.copyweavePlaceholder;
        restoreAttribute(element, "contenteditable", snapshots.contenteditable);
        restoreAttribute(element, "role", snapshots.role);
        restoreAttribute(element, "aria-label", snapshots.label);
        restoreAttribute(element, "spellcheck", snapshots.spellcheck);
      }
    },
    destroy: () => {
      delete element.dataset.copyweaveField;
      delete element.dataset.copyweavePlaceholder;
      restoreAttribute(element, "contenteditable", snapshots.contenteditable);
      restoreAttribute(element, "role", snapshots.role);
      restoreAttribute(element, "aria-label", snapshots.label);
      restoreAttribute(element, "spellcheck", snapshots.spellcheck);
    },
  };
};

const wrappedBinding = (node: Text, key: string): FieldBinding => {
  const source = splitWhitespace(node.nodeValue ?? "");
  const wrapper = document.createElement("copyweave-field");
  wrapper.dataset.copyweaveKey = key;
  wrapper.textContent = source.value;

  const fragment = document.createDocumentFragment();
  if (source.prefix) fragment.append(document.createTextNode(source.prefix));
  fragment.append(wrapper);
  if (source.suffix) fragment.append(document.createTextNode(source.suffix));
  node.parentNode?.replaceChild(fragment, node);

  return {
    key,
    element: wrapper,
    defaultValue: source.value,
    direct: false,
    read: () => wrapper.textContent ?? "",
    write: (value) => {
      wrapper.textContent = value;
    },
    setEditing: (enabled, placeholder) => {
      if (enabled) {
        wrapper.dataset.copyweavePlaceholder = placeholder;
        wrapper.setAttribute("contenteditable", "plaintext-only");
        wrapper.setAttribute("role", "textbox");
        wrapper.setAttribute("aria-label", `${key}: ${(wrapper.textContent ?? "").slice(0, 60)}`);
        wrapper.setAttribute("spellcheck", "true");
      } else {
        delete wrapper.dataset.copyweavePlaceholder;
        wrapper.removeAttribute("contenteditable");
        wrapper.removeAttribute("role");
        wrapper.removeAttribute("aria-label");
        wrapper.removeAttribute("spellcheck");
      }
    },
    destroy: () => wrapper.replaceWith(document.createTextNode(wrapper.textContent ?? "")),
  };
};

const allTextNodes = (root: ParentNode, options: DiscoverOptions) => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkip(node as Text, options) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);
  return nodes;
};

export const discoverFields = (options: DiscoverOptions) => {
  const diagnostics: CopyWeaveDiagnostic[] = [];
  const planned: Array<{node?: Text; element?: HTMLElement; key: string}> = [];
  const keys = new Set<string>();
  const selector = `[${options.idAttribute}]`;
  const explicitElements = [
    ...(options.root instanceof HTMLElement && options.root.matches(selector) ? [options.root] : []),
    ...Array.from(options.root.querySelectorAll<HTMLElement>(selector)),
  ];
  const declaredKeys = new Set<string>();
  const seenExplicitIds = new Set<string>();
  for (const element of explicitElements) {
    if (element.closest(options.exclude) || isHidden(element) || element.closest(`[${options.ignoreAttribute}]`)) continue;
    const id = element.getAttribute(options.idAttribute)?.trim() ?? "";
    if (isSafeFieldKey(id)) declaredKeys.add(id);
  }

  for (const element of explicitElements) {
    if (element.closest(options.exclude) || isHidden(element) || element.closest(`[${options.ignoreAttribute}]`)) continue;
    const id = element.getAttribute(options.idAttribute)?.trim() ?? "";
    if (!isSafeFieldKey(id)) {
      diagnostics.push({code: "invalid-field-id", level: "error", message: `Invalid ${options.idAttribute}: ${id || "(empty)"}`, key: id});
      continue;
    }
    if (seenExplicitIds.has(id) || keys.has(id)) {
      diagnostics.push({code: "duplicate-field-id", level: "error", message: `Duplicate field ID: ${id}`, key: id});
      continue;
    }
    seenExplicitIds.add(id);
    if (element.children.length === 0) {
      keys.add(id);
      planned.push({element, key: id});
      continue;
    }

    diagnostics.push({
      code: "complex-explicit-field",
      level: "warning",
      message: `${id} contains nested elements; split it into leaf fields for long-term stability.`,
      key: id,
    });
    const textNodes = allTextNodes(element, options).filter(
      (node) => node.parentElement?.closest(selector) === element,
    );
    textNodes.forEach((node, index) => {
      const key = `${id}.${index}`;
      if (!isSafeFieldKey(key)) {
        diagnostics.push({
          code: "invalid-field-id",
          level: "error",
          message: `Nested field ID exceeds CopyWeave limits: ${key}`,
          key,
        });
        return;
      }
      if (keys.has(key) || declaredKeys.has(key)) {
        diagnostics.push({code: "duplicate-field-id", level: "error", message: `Duplicate field ID: ${key}`, key});
        return;
      }
      keys.add(key);
      planned.push({node, key});
    });
  }

  if (options.mode !== "explicit") {
    for (const node of allTextNodes(options.root, options)) {
      if (node.parentElement?.closest(selector)) continue;
      const key = automaticKey(node, options.root);
      if (!isSafeFieldKey(key)) {
        diagnostics.push({
          code: "automatic-field-id-too-long",
          level: "warning",
          message: "Automatic field path exceeds 240 characters and was not made editable. Add a short semantic data-copy-id.",
          key: key.slice(0, 240),
        });
        continue;
      }
      if (keys.has(key)) continue;
      keys.add(key);
      planned.push({node, key});
      diagnostics.push({
        code: "automatic-field-id",
        level: "info",
        message: `Automatic field ${key} can move after a DOM refactor. Add ${options.idAttribute} for durable content.`,
        key,
      });
    }
  }

  const fields = new Map<string, FieldBinding>();
  for (const item of planned) {
    const field = item.element ? directBinding(item.element, item.key) : wrappedBinding(item.node!, item.key);
    fields.set(field.key, field);
  }

  return {fields, diagnostics};
};

export const insertPlainText = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData("text/plain");
  if (text === undefined) return;
  event.preventDefault();
  const selection = globalThis.getSelection?.();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text.replace(/[\r\n]+/g, " "));
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  (event.currentTarget as HTMLElement | null)?.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText", data: text}));
};
