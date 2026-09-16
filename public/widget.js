
(function () {
  if (window.__hamroChatWidgetLoaded) return;

  var scriptTag = document.currentScript;

  if (!scriptTag) {
    console.error("[widget] Could not find the widget script tag.");
    return;
  }

  var orgSlug = scriptTag.getAttribute("data-org");
  var explicitUser = scriptTag.getAttribute("data-user") || "";
  var embedKey = scriptTag.getAttribute("data-key") || "";

  if (!orgSlug) {
    console.error(
      "[widget] Missing required data-org attribute on the script tag."
    );
    return;
  }

  var hostPath = window.location.pathname;

  if (orgSlug === "hamrochatbot-support" && hostPath === "/login") {
    return;
  }

  window.__hamroChatWidgetLoaded = true;
  var scriptUrl = new URL(scriptTag.src);
  var ORIGIN = scriptUrl.origin;

  /*
   * These are the organization's SAVED defaults.
   *
   * widget.js gets them from the database through:
   *
   * GET /api/orgs/appearance
   *
   * A visitor can temporarily override position during their
   * current session, but that override is never saved here.
   */
  var widgetColor = "#123A3E";
  var widgetPosition = "bottom-right";
  var isLeft = false;

  var sessionPosition = null;
  var savedPosition = null;
  var appearanceLoading = false;
  var isOpen = false;
  var expanded = false;

  var THIN = {
    width: 380,
    height: 500,
  };

  var EXPANDED = {
    width: 500,
    height: 500,
  };

  var CHAT_ICON = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M16 7V4M7 16H4M28 16h-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="3" r="2" fill="currentColor"/><rect x="7" y="8" width="18" height="18" rx="7" stroke="currentColor" stroke-width="2.2"/><rect x="10" y="12" width="12" height="7" rx="3.5" fill="currentColor" fill-opacity=".2"/><path d="M12 15v2M20 15v2M13 22c2 1.5 4 1.5 6 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  var CLOSE_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  /*
   * Launcher button
   */
  var button = document.createElement("button");

  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.setAttribute("aria-expanded", "false");

  button.style.cssText = [
    "all:initial",
    "box-sizing:border-box",
    "padding:0",
    "color:white",
    "position:fixed",
    "width:56px",
    "height:56px",
    "border-radius:50%",
    "background:" + widgetColor,
    "border:none",
    "cursor:pointer",
    "box-shadow:0 4px 14px rgba(0,0,0,0.25)",
    "z-index:2147483001",

    // Don't show until the appearance API has returned.
    "display:none",

    "align-items:center",
    "justify-content:center",
  ].join(";");

  button.innerHTML = CHAT_ICON;

  /*
   * Chat panel
   */
  var panel = document.createElement("div");

  panel.style.cssText = "all:initial;box-sizing:border-box";
  panel.id = "hamro-chat-panel";
  button.setAttribute("aria-controls", panel.id);
  panel.style.display = "none";
  panel.style.position = "fixed";
  panel.style.zIndex = "2147483000";
  panel.style.background = "white";
  panel.style.borderRadius = "16px";
  panel.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
  panel.style.overflow = "hidden";
  panel.style.transition =
    "width 0.18s ease, height 0.18s ease";

  function isMobile() {
    return window.innerWidth <= 480;
  }

  /*
   * iframe
   */
  var iframe = document.createElement("iframe");

  var iframeSrc =
    ORIGIN +
    "/embed?org=" +
    encodeURIComponent(orgSlug) +
    "&layout=" +
    (isMobile() ? "mobile" : "desktop") +
    "&path=" +
    encodeURIComponent(hostPath);

  if (embedKey) {
    iframeSrc += "&key=" + encodeURIComponent(embedKey);
  }

  if (explicitUser) {
    iframeSrc += "&user=" + encodeURIComponent(explicitUser);
  }

  iframe.src = iframeSrc;

  iframe.style.cssText =
    "all:initial;width:100%;height:100%;border:none;display:block;";

  iframe.title = "Chat widget";

  panel.appendChild(iframe);

  /*
   * Position the launcher.
   */
  function viewport() {
    var v = window.visualViewport;
    return { width: v ? v.width : window.innerWidth,
      height: v ? v.height : window.innerHeight,
      top: v ? v.offsetTop : 0, left: v ? v.offsetLeft : 0 };
  }

  function applyButtonPosition() {
    var v = viewport();
    button.style.bottom = "auto";
    button.style.right = "auto";
    button.style.top = Math.max(v.top + 8, v.top + v.height - 76 - composerInset()) + "px";
    button.style.left = (isLeft ? v.left + 16 : v.left + v.width - 72) + "px";
  }

  function composerInset() {
    return orgSlug === "hamrochatbot-support" && window.location.pathname.indexOf("/dashboard/chat") === 0 ? 72 : 0;
  }

  function applyPanelLayout() {
    var v = viewport();
    var size = expanded ? EXPANDED : THIN;
    var width = Math.min(size.width, v.width - 24);
    var height = Math.min(size.height, v.height - 100 - composerInset());
    panel.style.bottom = "auto";
    panel.style.right = "auto";
    panel.style.top = Math.max(v.top + 12, v.top + v.height - 88 - composerInset() - height) + "px";
    panel.style.left = (isLeft ? v.left + 12 : v.left + v.width - width - 12) + "px";
    panel.style.width = width + "px";
    panel.style.height = Math.max(0, height) + "px";
    panel.style.borderRadius = "20px";
  }

  function openPanel() {
    isOpen = true;
    button.setAttribute("aria-expanded", "true");
    refreshAppearance();

    applyPanelLayout();

    panel.style.display = "block";

    button.innerHTML = CLOSE_ICON;
    button.setAttribute("aria-label", "Close chat");
  }

  function closePanel() {
    isOpen = false;
    button.setAttribute("aria-expanded", "false");
    button.focus();

    panel.style.display = "none";

    button.innerHTML = CHAT_ICON;
    button.setAttribute("aria-label", "Open chat");
  }

  button.addEventListener("click", function () {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  /*
   * Messages coming FROM the iframe.
   *
   * The iframe can:
   *
   * - expand/collapse
   * - close
   * - temporarily change position
   * - ask for the current saved appearance
   *
   * IMPORTANT:
   * The position message only changes this browser's widget.
   * It does NOT write to the database.
   */
  window.addEventListener("message", function (event) {
    if (!event.data) return;

    /*
     * Only accept widget iframe messages.
     *
     * This prevents unrelated iframes on the host page from
     * controlling the launcher.
     */
    if (event.source !== iframe.contentWindow) {
      return;
    }

    if (event.origin !== ORIGIN) {
      return;
    }

    /*
     * Expand/collapse.
     */
    if (event.data.type === "easy-re-widget-expand") {
      expanded = !!event.data.expanded;

      if (isOpen) {
        applyPanelLayout();
      }

      return;
    }

    /*
     * Close.
     */
    if (event.data.type === "easy-re-widget-close") {
      closePanel();
      return;
    }

    /*
     * Visitor/session-only position change.
     *
     * This changes the actual launcher immediately.
     *
     * It does NOT save anything to the database.
     */
    if (event.data.type === "easy-re-widget-position") {
      var nextPosition = event.data.position;

      if (
        nextPosition !== "bottom-left" &&
        nextPosition !== "bottom-right"
      ) {
        return;
      }

      sessionPosition = nextPosition;
      widgetPosition = nextPosition;
      isLeft = widgetPosition === "bottom-left";

      applyButtonPosition();

      if (isOpen) {
        applyPanelLayout();
      }

      return;
    }

    /*
     * The iframe has loaded and wants to know the current
     * organization appearance.
     *
     * Send the current value we have.
     */
    if (
      event.data.type ===
      "easy-re-widget-request-appearance"
    ) {
      sendAppearanceToIframe();

      return;
    }
  });

  // Isolate the embed from customer CSS (including button/svg !important rules).
  var host = document.createElement("div");
  host.style.cssText = "all:initial;position:static";
  var root = host.attachShadow({ mode: "open" });
  root.appendChild(panel);
  root.appendChild(button);
  function mount() { document.body.appendChild(host); refreshAppearance(); }

  function sendAppearanceToIframe() {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "easy-re-widget-appearance",
      position: widgetPosition, color: widgetColor, isMobile: isMobile() }, ORIGIN);
  }

  function refreshAppearance() {
    if (appearanceLoading) return;
    appearanceLoading = true;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 8000);
    fetch(ORIGIN + "/api/orgs/appearance?org=" + encodeURIComponent(orgSlug) +
      "&key=" + encodeURIComponent(embedKey),
      { cache: "no-store", credentials: "omit", signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error("Appearance request failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (/^#[0-9a-f]{6}$/i.test(data.widgetColor)) widgetColor = data.widgetColor;
        if (data.widgetPosition === "bottom-left" || data.widgetPosition === "bottom-right") {
          if (savedPosition !== null && savedPosition !== data.widgetPosition) sessionPosition = null;
          savedPosition = data.widgetPosition;
          widgetPosition = sessionPosition || savedPosition;
        }
      })
      .catch(function (error) { console.warn("[widget] Keeping last appearance:", error); })
      .finally(function () {
        clearTimeout(timeout);
        appearanceLoading = false;
        isLeft = widgetPosition === "bottom-left";
        button.style.background = widgetColor;
        var rgb = widgetColor.slice(1).match(/.{2}/g).map(function (c) { return parseInt(c, 16); });
        button.style.color = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 160 ? "#123A3E" : "#ffffff";
        applyButtonPosition();
        if (isOpen) applyPanelLayout();
        sendAppearanceToIframe();
        button.style.display = "flex";
      });
  }

  function resize() {
    applyButtonPosition();
    if (isOpen) applyPanelLayout();
    sendAppearanceToIframe();
  }
  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
    window.visualViewport.addEventListener("scroll", resize);
  }
  window.addEventListener("focus", refreshAppearance);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refreshAppearance();
  });
  setInterval(function () { if (!document.hidden) refreshAppearance(); }, 30000);
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen) closePanel();
  });
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
