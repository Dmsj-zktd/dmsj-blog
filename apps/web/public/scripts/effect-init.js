(function () {
  "use strict";
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  var effects = [
    "fade-up",
    "zoom-blur",
    "slide-left",
    "slide-right",
    "spin-fade",
  ];
  var effect = effects[Math.floor(Math.random() * effects.length)];
  document.documentElement.setAttribute("data-load-effect", effect);
})();
