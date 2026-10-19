(function () {
  "use strict";
  var root = document.documentElement;
  var allowed = ["builder", "hiring", "explorer"];

  function applyLens(value) {
    if (!allowed.includes(value)) return;
    root.setAttribute("data-lens", value);
    try {
      localStorage.setItem("dmsj-lens", value);
    } catch {
      // The in-page state still works when storage is unavailable.
    }

    document.querySelectorAll("[data-set-lens]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.getAttribute("data-set-lens") === value ? "true" : "false",
      );
    });

    var announcer = document.querySelector("[data-lens-announcer]");
    if (announcer) {
      var labels = { builder: "技术同行", hiring: "招聘评审", explorer: "兴趣探索" };
      announcer.textContent = "当前阅读视角：" + labels[value];
    }

    try {
      var url = new URL(window.location.href);
      if (value === "builder") url.searchParams.delete("lens");
      else url.searchParams.set("lens", value);
      window.history.replaceState({}, "", url);
    } catch {
      // Keep the page state if history is unavailable.
    }
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-set-lens]");
    if (!trigger) return;
    event.preventDefault();
    applyLens(trigger.getAttribute("data-set-lens"));
  });

  document.querySelectorAll("[data-set-lens]").forEach(function (button) {
    var selected = button.getAttribute("data-set-lens") === root.getAttribute("data-lens");
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
})();
