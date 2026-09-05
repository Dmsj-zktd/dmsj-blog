(function () {
  "use strict";
  var root = document.documentElement;
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cssVar(name, fallback) {
    return (
      getComputedStyle(root).getPropertyValue(name).trim() || fallback
    );
  }

  // —— 常驻环境粒子 ——
  var canvas = document.querySelector(".ambient-canvas");
  if (canvas && !reduced) {
    var context = canvas.getContext("2d");
    var particles = [];
    var width = 0;
    var height = 0;
    var color = cssVar("--accent", "rgba(90,90,90,1)");

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      var count = Math.min(20, Math.max(8, Math.floor(width / 90)));
      particles = Array.from({ length: count }, function () {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.7 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.16,
          a: 0.08 + Math.random() * 0.16,
          pulse: Math.random() * Math.PI * 2,
        };
      });
    }

    function frame(now) {
      context.clearRect(0, 0, width, height);
      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.015;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
        var alpha = p.a * (0.65 + 0.35 * Math.sin(p.pulse));
        context.beginPath();
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        context.fillStyle = color;
        context.globalAlpha = alpha;
        context.fill();
      }
      context.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    requestAnimationFrame(frame);
    // 主题切换后刷新粒子颜色
    window.setInterval(function () {
      color = cssVar("--accent", color);
    }, 5000);
  }

  // —— 跟随鼠标的微光（仅精确指针 + 非减少动效） ——
  var glow = document.querySelector(".cursor-glow");
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (glow && finePointer && !reduced) {
    var raf = null;
    var x = -200;
    var y = -200;

    function move(event) {
      x = event.clientX;
      y = event.clientY;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          glow.style.opacity = "1";
          glow.style.transform =
            "translate(" + x + "px, " + y + "px) translate(-50%, -50%)";
          raf = null;
        });
      }
    }

    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseleave", function () {
      glow.style.opacity = "0";
    });
  }
})();
