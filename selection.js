// selection.js — everything about selection shapes: creating, hit-testing,
// dragging, resizing, and drawing their on-canvas overlay/handles.
window.PX = window.PX || {};

PX.selection = (function () {
  const { distance, pointInPolygon, generateId } = PX.utils;
  const HANDLE_HIT_RADIUS = 14;

  function createSelection(type, x, y) {
    const id = generateId();
    const base = { id, type };
    if (type === 'rectangle' || type === 'roundedRect') {
      return {
        ...base,
        x: x - 60,
        y: y - 45,
        width: 120,
        height: 90,
        cornerRadius: type === 'roundedRect' ? 24 : 0
      };
    }
    if (type === 'circle') {
      return { ...base, x, y, radius: 60 };
    }
    if (type === 'polygon') {
      return { ...base, points: [{ x, y }] };
    }
    return base;
  }

  function hitTest(sel, px, py) {
    if (sel.type === 'rectangle' || sel.type === 'roundedRect') {
      return px >= sel.x && px <= sel.x + sel.width && py >= sel.y && py <= sel.y + sel.height;
    }
    if (sel.type === 'circle') {
      return distance(px, py, sel.x, sel.y) <= sel.radius;
    }
    if (sel.type === 'polygon') {
      return sel.points.length > 2 && pointInPolygon(px, py, sel.points);
    }
    return false;
  }

  function getHandles(sel) {
    if (sel.type === 'rectangle' || sel.type === 'roundedRect') {
      const { x, y, width: w, height: h } = sel;
      return {
        nw: { x, y }, ne: { x: x + w, y }, sw: { x, y: y + h }, se: { x: x + w, y: y + h },
        n: { x: x + w / 2, y }, s: { x: x + w / 2, y: y + h },
        e: { x: x + w, y: y + h / 2 }, w: { x, y: y + h / 2 }
      };
    }
    if (sel.type === 'circle') {
      return { radius: { x: sel.x + sel.radius, y: sel.y } };
    }
    return {}; // polygons are moved as a whole, no resize handles yet
  }

  function getHandleAt(sel, px, py) {
    const handles = getHandles(sel);
    for (const [name, pt] of Object.entries(handles)) {
      if (distance(px, py, pt.x, pt.y) <= HANDLE_HIT_RADIUS) return name;
    }
    return null;
  }

  function move(sel, dx, dy) {
    if (sel.type === 'polygon') {
      sel.points = sel.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      sel.x += dx;
      sel.y += dy;
    }
  }

  function resize(sel, handle, dx, dy, px, py) {
    if (sel.type === 'circle') {
      if (handle === 'radius') sel.radius = Math.max(10, distance(sel.x, sel.y, px, py));
      return;
    }
    if (sel.type === 'rectangle' || sel.type === 'roundedRect') {
      if (handle.includes('n')) { sel.height -= dy; sel.y += dy; }
      if (handle.includes('s')) { sel.height += dy; }
      if (handle.includes('w')) { sel.width -= dx; sel.x += dx; }
      if (handle.includes('e')) { sel.width += dx; }
      sel.width = Math.max(10, sel.width);
      sel.height = Math.max(10, sel.height);
    }
  }

  function drawOverlay(ctx, sel, isSelected) {
    ctx.save();
    PX.pixelator.buildClipPath(ctx, sel);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isSelected ? '#42e8d5' : 'rgba(66, 232, 213, 0.55)';
    ctx.setLineDash(isSelected ? [] : [6, 4]);
    ctx.stroke();
    ctx.restore();

    if (isSelected) {
      const handles = getHandles(sel);
      ctx.fillStyle = '#42e8d5';
      Object.values(handles).forEach((pt) => {
        ctx.beginPath();
        ctx.rect(pt.x - 5, pt.y - 5, 10, 10);
        ctx.fill();
      });
    }
  }

  function drawPolygonDraft(ctx, points) {
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = '#42e8d5';
    ctx.fillStyle = '#42e8d5';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function findAt(selections, px, py) {
    for (let i = selections.length - 1; i >= 0; i--) {
      if (hitTest(selections[i], px, py)) return selections[i];
    }
    return null;
  }

  return { createSelection, hitTest, getHandles, getHandleAt, move, resize, drawOverlay, drawPolygonDraft, findAt };
})();
