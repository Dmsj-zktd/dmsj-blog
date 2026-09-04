(function () {
  "use strict";
  var form = document.getElementById("search-form");
  var input = document.getElementById("search-input");
  var status = document.getElementById("search-status");
  var results = document.getElementById("search-results");
  if (!form || !input || !status || !results) return;

  var pagefind = null;
  var loading = false;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function render(items) {
    results.textContent = "";
    if (!items || items.length === 0) {
      setStatus("没有匹配结果");
      return;
    }
    setStatus("找到 " + items.length + " 条结果");
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "search-result";
      var a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.title || item.url;
      li.appendChild(a);
      if (item.excerpt) {
        var p = document.createElement("p");
        p.innerHTML = item.excerpt;
        li.appendChild(p);
      }
      results.appendChild(li);
    });
  }

  async function loadPagefind() {
    if (pagefind) return pagefind;
    if (loading) return null;
    loading = true;
    setStatus("正在加载索引…");
    try {
      var imported = await import("/pagefind/pagefind.js");
      pagefind = imported;
      await pagefind.init();
      return pagefind;
    } finally {
      loading = false;
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    runSearch(input.value.trim());
  });

  var timer = null;
  input.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      runSearch(input.value.trim());
    }, 180);
  });

  async function runSearch(query) {
    if (!query) {
      setStatus("输入至少 1 个字符开始搜索");
      results.textContent = "";
      return;
    }
    var engine = await loadPagefind();
    if (!engine) return;
    var response = await engine.search(query);
    if (!response || !response.results) {
      render([]);
      return;
    }
    var items = await Promise.all(
      response.results.slice(0, 30).map(function (result) {
        return result.data();
      }),
    );
    render(items);
  }
})();
