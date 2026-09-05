(function () {
  "use strict";
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    // 减少动态效果时仍保留纯透明度渐变，避免完全无反馈
    document.documentElement.setAttribute("data-load-effect", "fade");
    return;
  }
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
