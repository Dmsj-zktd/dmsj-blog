(function () {
  "use strict";

  // 阅读进度条
  var bar = document.createElement("div");
  bar.className = "reading-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  // 代码复制
  document.querySelectorAll(".article pre").forEach(function (pre) {
    if (pre.querySelector("button")) return;
    var lang = pre.getAttribute("data-language");
    if (lang) {
      var badge = document.createElement("span");
      badge.className = "code-lang";
      badge.textContent = lang.toUpperCase();
      pre.appendChild(badge);
    }
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-button";
    button.textContent = "复制代码";
    button.setAttribute("aria-label", "复制代码");
    button.addEventListener("click", async function () {
      var code = pre.querySelector("code");
      var text = code ? code.innerText : pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        var area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      button.textContent = "已复制";
      window.setTimeout(function () {
        button.textContent = "复制代码";
      }, 1600);
    });
    pre.appendChild(button);
  });
})();
