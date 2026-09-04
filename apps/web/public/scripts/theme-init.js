(function () {
  "use strict";
  var THEME_KEY = "dmsj-theme";
  var MODE_KEY = "dmsj-mode";
  var themes = ["paper", "gothic", "blueprint", "telegraph", "terminal"];
  var qs = new URLSearchParams(location.search);
  var savedTheme = localStorage.getItem(THEME_KEY);
  var theme = qs.get("theme") || savedTheme;
  if (!theme || themes.indexOf(theme) === -1) {
    theme = themes[Math.floor(Math.random() * themes.length)];
  }
  var savedMode = localStorage.getItem(MODE_KEY);
  var mode = qs.get("mode") || savedMode;
  if (mode !== "light" && mode !== "dark") {
    mode = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", mode);
  root.style.colorScheme = mode;
})();
