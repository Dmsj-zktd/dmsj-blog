(function () {
  "use strict";
  var el = document.getElementById("giscus");
  if (!el || el.dataset.loaded) return;
  el.dataset.loaded = "1";
  var params = new URLSearchParams({
    repo: el.dataset.repo,
    repoId: el.dataset.repoId,
    category: el.dataset.category,
    categoryId: el.dataset.categoryId,
    mapping: el.dataset.mapping,
    strict: el.dataset.strict,
    reactionsEnabled: el.dataset.reactionsEnabled,
    emitMetadata: el.dataset.emitMetadata,
    inputPosition: el.dataset.inputPosition,
    theme: el.dataset.theme,
    lang: el.dataset.lang,
    loading: el.dataset.loading,
  });
  var iframe = document.createElement("iframe");
  iframe.src = "https://giscus.app/client?" + params.toString();
  iframe.title = "评论区";
  iframe.loading = "lazy";
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("scrolling", "no");
  iframe.className = "giscus-frame";
  el.appendChild(iframe);
})();
