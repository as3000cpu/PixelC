// utils.js — small, dependency-free helper functions used across modules.
window.PX = window.PX || {};

PX.utils = {
  clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  },

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  // Ray-casting point-in-polygon test.
  pointInPolygon(px, py, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect =
        (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  },

  generateId() {
    return 'sel_' + Math.random().toString(36).slice(2, 10);
  }
};
