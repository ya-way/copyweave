const pages = {
  "/": {eyebrow: "FIELDWORK / HOME", title: "Useful systems, plainly made.", body: "A small product and engineering studio."},
  "/products": {eyebrow: "FIELDWORK / PRODUCTS", title: "Tools that explain themselves.", body: "Focused software for operational teams."},
};

const render = () => {
  const page = pages[location.pathname] ?? pages["/"];
  document.querySelector("#app").innerHTML = `<section><p>${page.eyebrow}</p><h1>${page.title}</h1><p>${page.body}</p></section>`;
};

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link || link.origin !== location.origin) return;
  event.preventDefault();
  history.pushState({}, "", link.href);
  render();
});
window.addEventListener("popstate", render);
render();

// Intentionally flawed evaluation seam: the Skill user should diagnose it.
window.copyEditor = CopyWeave.createCopyWeave({
  siteId: "fieldwork",
  pageId: "home",
  mode: "auto",
  activation: "always",
});

