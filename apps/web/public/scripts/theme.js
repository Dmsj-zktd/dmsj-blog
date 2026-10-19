(function () {
  "use strict";
  var root = document.documentElement;
  var appearance = ["auto", "light", "dark"];

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The current page still updates when persistence is unavailable.
    }
  }

  function syncButtons() {
    var current = root.getAttribute("data-theme") || "auto";
    document.querySelectorAll("[data-set-appearance]").forEach(function (button) {
      var selected = button.getAttribute("data-set-appearance") === current;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    var toggle = document.querySelector("[data-toggle-contrast]");
    if (toggle) toggle.checked = root.getAttribute("data-contrast") === "high";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var active = root.getAttribute("data-theme") || "auto";
      var dark =
        active === "dark" ||
        (active === "auto" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      meta.setAttribute("content", dark ? "#070a0f" : "#f1f4f3");
    }
  }

  function setAppearance(value) {
    if (!appearance.includes(value)) return;
    root.setAttribute("data-theme", value);
    save("dmsj-appearance", value);
    syncButtons();
    document.querySelectorAll("details[open]").forEach(function (details) {
      if (details.querySelector("[data-set-appearance]")) details.open = false;
    });
  }

  function setContrast(value) {
    var next = value === "high" ? "high" : "normal";
    root.setAttribute("data-contrast", next);
    save("dmsj-contrast", next);
    syncButtons();
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-set-appearance]");
    if (trigger) {
      event.preventDefault();
      setAppearance(trigger.getAttribute("data-set-appearance"));
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target.matches("[data-toggle-contrast]")) {
      setContrast(event.target.checked ? "high" : "normal");
    }
  });

  syncButtons();
  if (window.matchMedia) {
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      if (root.getAttribute("data-theme") === "auto") syncButtons();
    };
    if (media.addEventListener) media.addEventListener("change", onChange);
    else if (media.addListener) media.addListener(onChange);
  }
})();
