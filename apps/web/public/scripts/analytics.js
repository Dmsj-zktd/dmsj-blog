(function () {
  "use strict";
  var endpoint = "/api/track";
  if (
    !window.fetch ||
    !navigator.sendBeacon ||
    navigator.doNotTrack === "1" ||
    navigator.globalPrivacyControl
  ) {
    return;
  }
  var ua = navigator.userAgent || "";
  if (/bot|crawler|spider|headless|curl|python-requests|Go-http-client/i.test(ua)) {
    return;
  }
  var data = new URLSearchParams({
    path: location.pathname + location.search,
    referrer: document.referrer || "",
    title: document.title || "",
    vw: String(window.innerWidth || 0),
    lang: navigator.language || "",
  });
  function send() {
    try {
      navigator.sendBeacon(endpoint, data);
    } catch (err) {
      /* no-op */
    }
  }
  if (document.readyState === "complete") {
    send();
  } else {
    window.addEventListener("load", send, { once: true });
  }
})();
