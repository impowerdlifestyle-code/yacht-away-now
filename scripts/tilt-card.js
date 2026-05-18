/**
 * Vanilla port of the TiltCard React component.
 * Auto-binds to .spec-card, .price-card, and any [data-tilt] element.
 *
 * Per-element overrides via data attributes:
 *   data-tilt-limit="12"        max degrees (default 12)
 *   data-tilt-scale="1.04"      hover scale (default 1.04)
 *   data-tilt-perspective="1200"
 *   data-tilt-effect="evade"    "evade" (away from cursor) | "gravitate" (toward)
 *   data-tilt-spotlight="false" disables the radial spotlight follow
 *
 * Skips: prefers-reduced-motion, (hover: none) touch devices.
 */
(function () {
  "use strict";

  function bind(el) {
    if (el.dataset.tiltBound === "1") return;
    el.dataset.tiltBound = "1";

    var tiltLimit = parseFloat(el.dataset.tiltLimit) || 12;
    var scale = parseFloat(el.dataset.tiltScale) || 1.04;
    var perspective = parseFloat(el.dataset.tiltPerspective) || 1200;
    var effect = el.dataset.tiltEffect === "gravitate" ? "gravitate" : "evade";
    var spotlight = el.dataset.tiltSpotlight !== "false";
    var dir = effect === "evade" ? -1 : 1;

    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }
    el.style.transformStyle = "preserve-3d";
    el.style.transition = "transform 0.25s cubic-bezier(0.16,1,0.3,1)";
    el.style.willChange = "transform";

    var spot = null;
    var spotInner = null;
    if (spotlight) {
      spot = document.createElement("div");
      spot.style.cssText =
        "pointer-events:none;position:absolute;inset:0;opacity:0;transition:opacity 0.3s ease;z-index:5;border-radius:inherit;overflow:hidden;";
      spotInner = document.createElement("div");
      spotInner.style.cssText =
        "position:absolute;width:200%;height:200%;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,229,160,0.22) 0%,rgba(255,229,160,0.05) 30%,transparent 50%);";
      spot.appendChild(spotInner);
      el.appendChild(spot);
    }

    function move(e) {
      var rect = el.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var xRot = (py - 0.5) * (tiltLimit * 2) * dir;
      var yRot = (px - 0.5) * -(tiltLimit * 2) * dir;
      el.style.transform =
        "perspective(" +
        perspective +
        "px) rotateX(" +
        xRot.toFixed(2) +
        "deg) rotateY(" +
        yRot.toFixed(2) +
        "deg) scale3d(" +
        scale +
        "," +
        scale +
        "," +
        scale +
        ")";
      if (spotInner) {
        spotInner.style.left = (px * 100).toFixed(1) + "%";
        spotInner.style.top = (py * 100).toFixed(1) + "%";
      }
    }

    function enter() {
      if (spot) spot.style.opacity = "1";
    }

    function leave() {
      el.style.transform =
        "perspective(" +
        perspective +
        "px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
      if (spot) spot.style.opacity = "0";
    }

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
  }

  function init() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
      return;
    }
    var nodes = document.querySelectorAll(
      ".spec-card, .price-card, [data-tilt]"
    );
    nodes.forEach(bind);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
