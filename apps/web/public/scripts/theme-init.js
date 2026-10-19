(function () {
  "use strict";
  var root = document.documentElement;
  var appearance = "auto";
  var contrast = "normal";

  try {
    var savedAppearance = localStorage.getItem("dmsj-appearance");
    if (savedAppearance === "light" || savedAppearance === "dark" || savedAppearance === "auto") {
      appearance = savedAppearance;
    }
    if (localStorage.getItem("dmsj-contrast") === "high") contrast = "high";
  } catch {
    // Storage can be unavailable in privacy-focused or embedded contexts.
  }

  root.setAttribute("data-theme", appearance);
  root.setAttribute("data-contrast", contrast);
  try {
    var lens = new URLSearchParams(location.search).get("lens") ||
      localStorage.getItem("dmsj-lens") ||
      "builder";
    if (lens !== "builder" && lens !== "hiring" && lens !== "explorer") lens = "builder";
    root.setAttribute("data-lens", lens);
  } catch {
    root.setAttribute("data-lens", "builder");
  }
  root.setAttribute("data-js", "true");
})();
