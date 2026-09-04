(function () {
  "use strict";
  var THEME_KEY = "dmsj-theme";
  var MODE_KEY = "dmsj-mode";
  var themes = ["paper", "gothic", "blueprint", "telegraph", "terminal"];
  var root = document.documentElement;

  function applyTheme(theme) {
    if (themes.indexOf(theme) === -1) return;
    localStorage.setItem(THEME_KEY, theme);
    root.setAttribute("data-theme", theme);
  }

  function applyMode(mode) {
    if (mode !== "light" && mode !== "dark") return;
    localStorage.setItem(MODE_KEY, mode);
    root.setAttribute("data-mode", mode);
    root.style.colorScheme = mode;
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");
    if (action === "set-theme") applyTheme(target.getAttribute("data-value"));
    if (action === "set-mode") applyMode(target.getAttribute("data-value"));
  });
})();
