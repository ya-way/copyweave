const boot = () => {
  const editor = window.CopyWeave.createCopyWeave({
    siteId: "copyweave-demo",
    pageId: "home",
    pageName: "Demo / Home",
    mode: "explicit",
    activation: "query",
    contentUrl: "./copyweave.content.json",
    locale: "en",
    theme: {
      accent: "#ff4f2e",
      surface: "#171713",
      text: "#f4f0e6",
      muted: "#aaa69b"
    }
  });

  document.querySelector("[data-open-editor]")?.addEventListener("click", () => editor.open());
  window.copyweave = editor;
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once: true});
else boot();
