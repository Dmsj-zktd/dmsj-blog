(function () {
  "use strict";
  var endpoint = "/api/track";
  if (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:"
  ) {
    return;
  }
  if (
    !window.fetch ||
    !navigator.sendBeacon ||
    navigator.doNotTrack === "1" ||
    navigator.globalPrivacyControl ||
    navigator.connection?.saveData
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
