(function () {
  "use strict";
  var nodes = document.querySelectorAll('[data-role="tagline"]');
  if (nodes.length === 0) return;
  var options = [];
  try {
    var raw = nodes[0].getAttribute("data-options") || "[]";
    options = JSON.parse(raw);
  } catch (err) {
    options = [];
  }
  if (!Array.isArray(options) || options.length === 0) return;
  var phrase = options[Math.floor(Math.random() * options.length)];
  for (var i = 0; i < nodes.length; i += 1) {
    nodes[i].textContent = phrase;
  }
})();
