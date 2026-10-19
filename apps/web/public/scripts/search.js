(function () {
  "use strict";

  var pagefindPromise;
  var sequence = 0;
  var shortcut = document.querySelector("[data-search-shortcut]");
  if (shortcut && !/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    shortcut.textContent = "Ctrl K";
  }

  function loadPagefind() {
    if (!pagefindPromise) {
      pagefindPromise = import("/pagefind/pagefind.js")
        .then(function (pagefind) {
          if (typeof pagefind.options === "function") {
            pagefind.options({ excerptLength: 32 });
          }
          return pagefind;
        })
        .catch(function (error) {
          pagefindPromise = undefined;
          throw error;
        });
    }
    return pagefindPromise;
  }

  function safePath(value) {
    try {
      var url = new URL(String(value || "/"), window.location.origin);
      if (url.origin !== window.location.origin) return "/";
      return url.pathname + url.search + url.hash;
    } catch (_error) {
      return "/";
    }
  }

  function appendSafeExcerpt(target, value) {
    var parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
    function walk(node, parent) {
      node.childNodes.forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          parent.appendChild(document.createTextNode(child.nodeValue || ""));
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (child.tagName.toLowerCase() === "mark") {
          var mark = document.createElement("mark");
          mark.textContent = child.textContent || "";
          parent.appendChild(mark);
          return;
        }
        walk(child, parent);
      });
    }
    walk(parsed.body, target);
  }

  function renderResults(list, items, status, label) {
    list.replaceChildren();
    items.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "search-result";
      var link = document.createElement("a");
      link.href = safePath(item.url);
      var title = item.meta && item.meta.title ? item.meta.title : item.title;
      link.textContent = title || "未命名页面";
      var excerpt = document.createElement("p");
      appendSafeExcerpt(excerpt, item.excerpt || "");
      row.append(link, excerpt);
      list.appendChild(row);
    });
    status.textContent =
      items.length === 0
        ? "没有匹配结果，换一个关键词试试。"
        : "找到 " + items.length + " 条" + (label || "结果") + "。";
  }

  function filtersFrom(scope) {
    var filters = {};
    scope.querySelectorAll("[data-search-filter]").forEach(function (control) {
      if (!control.value) return;
      filters[control.getAttribute("data-search-filter")] = control.value;
    });
    return filters;
  }

  async function executeSearch(scope, input, list, status, limit, updateUrl, label) {
    var query = input.value.trim();
    var ticket = ++sequence;
    if (!query) {
      list.replaceChildren();
      status.textContent = "输入至少 1 个字符开始搜索。";
      return;
    }
    status.textContent = "正在检索本地索引…";
    if (updateUrl) {
      var url = new URL(window.location.href);
      url.searchParams.set("q", query);
      window.history.replaceState(null, "", url);
    }
    try {
      var pagefind = await loadPagefind();
      var response = await pagefind.search(query, { filters: filtersFrom(scope) });
      var items = await Promise.all(
        response.results.slice(0, limit).map(function (result) {
          return result.data();
        }),
      );
      if (ticket !== sequence) return;
      renderResults(list, items, status, label);
    } catch (_error) {
      if (ticket !== sequence) return;
      list.replaceChildren();
      status.textContent = "搜索索引尚未加载。请稍后刷新，或从归档、标签和前沿页继续浏览。";
    }
  }

  function wireField(scope, input, list, status, limit, updateUrl, label) {
    var timer;
    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        executeSearch(scope, input, list, status, limit, updateUrl, label);
      }, 140);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      window.clearTimeout(timer);
      executeSearch(scope, input, list, status, limit, updateUrl, label);
    });
    scope.querySelectorAll("[data-search-filter]").forEach(function (control) {
      control.addEventListener("change", function () {
        executeSearch(scope, input, list, status, limit, updateUrl, label);
      });
    });
  }

  function initDialog() {
    var dialog = document.querySelector("[data-search-dialog]");
    var trigger = document.querySelector("[data-open-search]");
    if (!dialog || !trigger) return;
    var input = dialog.querySelector("[data-search-input]");
    var list = dialog.querySelector("[data-search-results]");
    var status = dialog.querySelector("[data-search-status]");
    var close = dialog.querySelector("[data-close-search]");
    if (!input || !list || !status) return;

    wireField(dialog, input, list, status, 7, false, "结果");

    function open() {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      trigger.setAttribute("aria-expanded", "true");
      window.setTimeout(function () {
        input.focus();
        input.select();
      }, 20);
    }

    function closeDialog() {
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      else dialog.removeAttribute("open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      open();
    });
    close && close.addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", function () {
      trigger.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.open) closeDialog();
        else open();
      }
    });
  }

  function initPage() {
    var page = document.querySelector("[data-search-page]");
    if (!page) return;
    var input = page.querySelector("[data-search-input]");
    var list = page.querySelector("[data-search-results]");
    var status = page.querySelector("[data-search-status]");
    if (!input || !list || !status) return;
    wireField(page, input, list, status, 20, true, "相关结果");
    var initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      input.value = initial;
        executeSearch(page, input, list, status, 20, true, "相关结果");
    }
  }

  initDialog();
  initPage();
})();
