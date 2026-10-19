(function () {
  "use strict";
  var article = document.querySelector(".article");
  if (!article) return;

  var bar = document.querySelector("[data-reading-progress]");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "reading-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
  }

  function updateProgress() {
    var rect = article.getBoundingClientRect();
    var total = Math.max(1, article.offsetHeight - window.innerHeight * 0.45);
    var traveled = Math.min(total, Math.max(0, -rect.top + window.innerHeight * 0.2));
    bar.style.width = (traveled / total) * 100 + "%";
  }

  var frame = 0;
  function scheduleProgress() {
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      updateProgress();
    });
  }

  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress, { passive: true });
  window.requestAnimationFrame(updateProgress);

  document.querySelectorAll(".article pre").forEach(function (pre) {
    if (pre.querySelector(".copy-button")) return;
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
      } catch {
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

  var links = Array.from(document.querySelectorAll(".toc-link"));
  if (!links.length || !("IntersectionObserver" in window)) return;
  var byId = new Map(links.map(function (link) {
    return [link.getAttribute("href").slice(1), link];
  }));
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        document.querySelectorAll(".toc-link").forEach(function (link) {
          link.removeAttribute("aria-current");
          link.classList.remove("is-active");
        });
        var active = byId.get(entry.target.id);
        if (active) {
          active.setAttribute("aria-current", "location");
          active.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-12% 0px -72% 0px", threshold: [0, 1] },
  );
  byId.forEach(function (_link, id) {
    var heading = document.getElementById(id);
    if (heading) observer.observe(heading);
  });
})();
