(function () {
  var scriptTag = document.currentScript;
  var orgSlug = scriptTag.getAttribute("data-org");
  var explicitUser = scriptTag.getAttribute("data-user") || "";
  var embedKey = scriptTag.getAttribute("data-key") || "";

  if (!orgSlug) {
    console.error("[widget] Missing required data-org attribute on the script tag.");
    return;
  }

  // Derive our own origin from the script's own src, so this works
  // correctly wherever it's hosted (localhost during dev, real domain later).
  var scriptUrl = new URL(scriptTag.src);
  var ORIGIN = scriptUrl.origin;

  var isOpen = false;

  // --- Button ---
  var button = document.createElement("button");
  button.setAttribute("aria-label", "Open chat");
  button.style.cssText = [
    "position:fixed",
    "bottom:20px",
    "right:20px",
    "width:56px",
    "height:56px",
    "border-radius:50%",
    "background:#0b2545",
    "border:none",
    "cursor:pointer",
    "box-shadow:0 4px 14px rgba(0,0,0,0.25)",
    "z-index:2147483000",
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ].join(";");
  button.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="7" cy="12" r="1.5" fill="white"/>' +
    '<circle cx="12" cy="12" r="1.5" fill="white"/>' +
    '<circle cx="17" cy="12" r="1.5" fill="white"/>' +
    "</svg>";

  // --- Panel (iframe wrapper) ---
  var panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.position = "fixed";
  panel.style.zIndex = "2147483000";
  panel.style.background = "white";
  panel.style.borderRadius = "16px";
  panel.style.boxShadow = "0 8px 30px rgba(0,0,0,0.25)";
  panel.style.overflow = "hidden";

  var iframe = document.createElement("iframe");
var iframeSrc = ORIGIN + "/embed?org=" + encodeURIComponent(orgSlug);
if (embedKey) iframeSrc += "&key=" + encodeURIComponent(embedKey);
if (explicitUser) iframeSrc += "&user=" + encodeURIComponent(explicitUser);

  iframe.src = iframeSrc;
  iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
  iframe.title = "Chat widget";
  panel.appendChild(iframe);

  function isMobile() {
    return window.innerWidth <= 480;
  }

  function applyPanelLayout() {
    if (isMobile()) {
      // Full screen on mobile, always — matches the dashboard's own mobile behavior.
      panel.style.top = "0";
      panel.style.left = "0";
      panel.style.right = "0";
      panel.style.bottom = "0";
      panel.style.width = "100%";
      panel.style.height = "100%";
      panel.style.borderRadius = "0";
    } else {
      panel.style.top = "";
      panel.style.left = "";
      panel.style.bottom = "90px";
      panel.style.right = "20px";
      panel.style.width = "380px";
      panel.style.height = "560px";
      panel.style.borderRadius = "16px";
    }
  }

  function openPanel() {
    isOpen = true;
    applyPanelLayout();
    panel.style.display = "block";
  }

  function closePanel() {
    isOpen = false;
    panel.style.display = "none";
  }

  button.addEventListener("click", function () {
    if (isOpen) closePanel();
    else openPanel();
  });

  window.addEventListener("resize", function () {
    if (isOpen) applyPanelLayout();
  });

  // Both elements are independent direct children of <body> -- never nested
  // inside each other or any other fixed-position wrapper. Nesting fixed
  // elements was the exact bug that broke mobile full-screen CSS in Mode 1.
  document.body.appendChild(panel);
  document.body.appendChild(button);
})();