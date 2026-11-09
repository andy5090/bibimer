"use strict";
(() => {
  function attach(panel, {getSize, setSize, enabled = () => true, min = 10, max = 26}) {
    if (!panel?.addEventListener || typeof getSize !== "function" || typeof setSize !== "function" ||
        !Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max < min) throw new TypeError("Invalid text gesture configuration");
    let gesture = null, suppressed = null, destroyed = false;
    const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const inside = touch => {
      const bounds = panel.getBoundingClientRect();
      return panel.contains(touch.target) && Number.isFinite(touch.clientX) && Number.isFinite(touch.clientY) &&
        touch.clientX >= bounds.left && touch.clientX <= bounds.right && touch.clientY >= bounds.top && touch.clientY <= bounds.bottom;
    };
    const cancel = () => {
      if (gesture?.changed) suppressed = {until:performance.now() + 400, points:gesture.points};
      gesture = null;
    };
    const start = event => {
      if (!gesture) suppressed = null;
      cancel();
      if (destroyed || !enabled() || event.cancelable === false || event.touches.length !== 2) return;
      const points = [...event.touches], size = getSize(), gap = distance(...points);
      if (points[0].identifier === points[1].identifier || !points.every(inside) || !Number.isFinite(size) || size <= 0 || !Number.isFinite(gap) || gap <= 0) return;
      gesture = {ids:points.map(point => point.identifier), gap, size, last:Math.round(size), points, changed:false};
      event.preventDefault();
    };
    const move = event => {
      if (!gesture) return;
      if (!enabled() || event.cancelable === false || event.touches.length !== 2) { cancel(); return; }
      const points = gesture.ids.map(id => [...event.touches].find(point => point.identifier === id));
      if (points.some(point => !point)) { cancel(); return; }
      const gap = distance(...points);
      if (!Number.isFinite(gap) || gap <= 0) { cancel(); return; }
      event.preventDefault();
      gesture.points = points;
      const size = Math.max(min, Math.min(max, Math.round(gesture.size * gap / gesture.gap)));
      if (size !== gesture.last) {
        gesture.last = size; gesture.changed = true; setSize(size);
      }
    };
    const end = event => {
      if (!gesture) return;
      if (!enabled()) { cancel(); return; }
      if (event.changedTouches) {
        gesture.points = gesture.points.map(point => [...event.changedTouches].find(changed => changed.identifier === point.identifier) || point);
      }
      if (gesture.changed && event.cancelable !== false) event.preventDefault();
      cancel();
    };
    const click = event => {
      if (!suppressed || performance.now() >= suppressed.until || !event.isTrusted || event.detail === 0) return;
      if (event.pointerType && event.pointerType !== "touch") return;
      if (event.sourceCapabilities && !event.sourceCapabilities.firesTouchEvents) return;
      // Safari can expose touch-generated clicks as MouseEvents. Restrict that
      // fallback to this panel and the actual pinch's final finger positions.
      if (!panel.contains(event.target) || !suppressed.points.some(point => distance(point, event) <= 32)) return;
      event.preventDefault(); event.stopImmediatePropagation(); suppressed = null;
    };
    const listeners = [["touchstart",start,{capture:true,passive:false}], ["touchmove",move,{capture:true,passive:false}],
      ["touchend",end,{capture:true,passive:false}], ["touchcancel",end,{capture:true,passive:false}], ["click",click,true]];
    for (const [type, listener, options] of listeners) panel.addEventListener(type, listener, options);
    return Object.freeze({cancel, destroy() {
      cancel(); destroyed = true; suppressed = null;
      for (const [type, listener, options] of listeners) panel.removeEventListener(type, listener, options);
    }});
  }
  window.BibimerTextGestures = Object.freeze({attach});
})();
