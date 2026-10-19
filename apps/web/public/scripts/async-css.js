(function () {
  "use strict";
  function activate() {
    document.querySelectorAll('link[data-async-css]').forEach(function (link) {
      link.media = "all";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate, { once: true });
  } else {
    activate();
  }
})();
