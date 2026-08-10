
(function () {
  if (window.__hamroChatWidgetLoaded) return;
  window.__hamroChatWidgetLoaded = true;

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

  var CHAT_ICON =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C10.6421 20 9.36313 19.6737 8.23367 19.0929L4 20L5.11616 16.6421C4.40806 15.4526 4 14.0781 4 12.6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="8.5" cy="12" r="1" fill="white"/>' +
    '<circle cx="12" cy="12" r="1" fill="white"/>' +
    '<circle cx="15.5" cy="12" r="1" fill="white"/>' +
    "</svg>";

  var CLOSE_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6 6L18 18M6 18L18 6" stroke="white" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";

  /*
   * Launcher button
   */
  var button = document.createElement("button");

  button.setAttribute("aria-label", "Open chat");

  button.style.cssText = [
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
    "width:100%;height:100%;border:none;display:block;";

  iframe.title = "Chat widget";

  panel.appendChild(iframe);

  /*
   * Position the launcher.
   */
  function applyButtonPosition() {
    button.style.left = "";
    button.style.right = "";

    if (isMobile()) {
      button.style.bottom = "100px";

      if (isLeft) {
        button.style.left = "16px";
      } else {
        button.style.right = "16px";
      }
    } else {
      button.style.bottom = "52px";

      if (isLeft) {
        button.style.left = "20px";
      } else {
        button.style.right = "20px";
      }
    }
  }

  /*
   * Position and size the chat panel.
   */
  function applyPanelLayout() {
    panel.style.left = "";
    panel.style.right = "";

    if (isMobile()) {
      panel.style.top = "";
      panel.style.bottom = "170px";

      if (isLeft) {
        panel.style.left = "10px";
      } else {
        panel.style.right = "10px";
      }

      panel.style.width = "calc(100% - 20px)";
      panel.style.height = "55vh";
      panel.style.borderRadius = "16px";
    } else {
      var size = expanded ? EXPANDED : THIN;

      panel.style.top = "";
      panel.style.bottom = "110px";

      if (isLeft) {
        panel.style.left = "20px";
      } else {
        panel.style.right = "20px";
      }

      panel.style.width = size.width + "px";
      panel.style.height = size.height + "px";
      panel.style.borderRadius = "16px";
    }
  }

  function openPanel() {
    isOpen = true;

    applyPanelLayout();

    panel.style.display = "block";

    button.innerHTML = CLOSE_ICON;
    button.setAttribute("aria-label", "Close chat");
  }

  function closePanel() {
    isOpen = false;

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
   * Keep the launcher/panel positioned correctly when the host
   * page changes size.
   */
  window.addEventListener("resize", function () {
    applyButtonPosition();

    if (isOpen) {
      applyPanelLayout();
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
      iframe.contentWindow.postMessage(
        {
          type: "easy-re-widget-appearance",
          position: widgetPosition,
          color: widgetColor,
        },
        ORIGIN
      );

      return;
    }
  });

  document.body.appendChild(panel);
  document.body.appendChild(button);

  /*
   * Send the current appearance to the iframe.
   *
   * This is called after the database API returns.
   */
  function sendAppearanceToIframe() {
    if (!iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: "easy-re-widget-appearance",
        position: widgetPosition,
        color: widgetColor,
      },
      ORIGIN
    );
  }

  /*
   * Fetch the organization's CURRENT saved appearance.
   *
   * This is the important part that removes the need to
   * re-paste the embed script after changing settings.
   */
  fetch(
    ORIGIN +
      "/api/orgs/appearance?org=" +
      encodeURIComponent(orgSlug) +
      "&key=" +
      encodeURIComponent(embedKey)
  )
    .then(function (res) {
      if (!res.ok) {
        throw new Error(
          "Appearance request failed: " + res.status
        );
      }

      return res.json();
    })
    .then(function (data) {
      /*
       * Color
       */
      if (
        typeof data.widgetColor === "string" &&
        data.widgetColor
      ) {
        widgetColor = data.widgetColor;
      }

      /*
       * Position
       */
      if (
        data.widgetPosition === "bottom-left" ||
        data.widgetPosition === "bottom-right"
      ) {
        widgetPosition = data.widgetPosition;
      } else {
        widgetPosition = "bottom-right";
      }

      isLeft = widgetPosition === "bottom-left";

      /*
       * Apply saved appearance to launcher.
       */
      button.style.background = widgetColor;

      applyButtonPosition();

      /*
       * Tell the iframe the same saved position.
       */
      sendAppearanceToIframe();

      /*
       * Now show the launcher.
       *
       * This prevents the user from seeing the default position/color
       * for a moment before the database value arrives.
       */
      button.style.display = "flex";
    })
    .catch(function (error) {
      console.error(
        "[widget] Failed to load appearance:",
        error
      );

      /*
       * Safe fallback.
       *
       * If the API is unavailable, the widget still works using
       * the default appearance.
       */
      widgetColor = "RGB(93,131,117)";
      widgetPosition = "bottom-right";
      isLeft = false;

      button.style.background = widgetColor;

      applyButtonPosition();

      sendAppearanceToIframe();

      button.style.display = "flex";
    });
})();

