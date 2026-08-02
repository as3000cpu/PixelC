// pixelator.js — the actual pixelation algorithms. No UI code lives here.
window.PX = window.PX || {};

PX.pixelator = (function () {
  // Downscale-then-upscale a rectangular region in place, on the given ctx.
  function pixelateRect(ctx, x, y, w, h, pixelSize) {
    if (w <= 0 || h <= 0) return;
    const size = Math.max(1, Math.floor(pixelSize));
    const smallW = Math.max(1, Math.floor(w / size));
    const smallH = Math.max(1, Math.floor(h / size));

    const off = document.createElement('canvas');
    off.width = smallW;
    off.height = smallH;
    off.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, smallW, smallH);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(off, 0, 0, smallW, smallH, x, y, w, h);
    ctx.restore();
  }

  function pixelateEntireCanvas(ctx, w, h, pixelSize) {
    pixelateRect(ctx, 0, 0, w, h, pixelSize);
  }

  function getSelectionBBox(sel) {
    if (sel.type === 'rectangle' || sel.type === 'roundedRect') {
      return { x: sel.x, y: sel.y, width: sel.width, height: sel.height };
    }
    if (sel.type === 'circle') {
      return {
        x: sel.x - sel.radius,
        y: sel.y - sel.radius,
        width: sel.radius * 2,
        height: sel.radius * 2
      };
    }
    if (sel.type === 'polygon' && sel.points.length > 1) {
      const xs = sel.points.map((p) => p.x);
      const ys = sel.points.map((p) => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    return null;
  }

  function drawRoundedRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.arcTo(x + w, y, x + w, y + radius, radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
    ctx.lineTo(x + radius, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // Builds (but does not stroke/fill/clip) the path for a selection's shape.
  function buildClipPath(ctx, sel) {
    ctx.beginPath();
    if (sel.type === 'rectangle') {
      ctx.rect(sel.x, sel.y, sel.width, sel.height);
    } else if (sel.type === 'roundedRect') {
      drawRoundedRectPath(ctx, sel.x, sel.y, sel.width, sel.height, sel.cornerRadius || 20);
    } else if (sel.type === 'circle') {
      ctx.arc(sel.x, sel.y, sel.radius, 0, Math.PI * 2);
    } else if (sel.type === 'polygon') {
      sel.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
    }
  }

  // Pixelates only the pixels inside an arbitrary-shaped selection, leaving
  // everything outside it untouched.
  function pixelateSelection(ctx, canvas, sel, pixelSize) {
    const bbox = getSelectionBBox(sel);
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;
    const { x, y, width, height } = bbox;

    const size = Math.max(1, Math.floor(pixelSize));
    const smallW = Math.max(1, Math.floor(width / size));
    const smallH = Math.max(1, Math.floor(height / size));

    // Downscale the bounding box...
    const small = document.createElement('canvas');
    small.width = smallW;
    small.height = smallH;
    small.getContext('2d').drawImage(canvas, x, y, width, height, 0, 0, smallW, smallH);

    // ...then upscale it back, blocky, on its own offscreen canvas.
    const pixelated = document.createElement('canvas');
    pixelated.width = width;
    pixelated.height = height;
    const pCtx = pixelated.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    pCtx.drawImage(small, 0, 0, smallW, smallH, 0, 0, width, height);

    // Finally, stamp the pixelated bbox onto the main canvas, clipped to
    // the selection's actual shape (circle, rounded rect, polygon, etc).
    ctx.save();
    buildClipPath(ctx, sel);
    ctx.clip();
    ctx.drawImage(pixelated, x, y);
    ctx.restore();
  }

  return {
    pixelateRect,
    pixelateEntireCanvas,
    pixelateSelection,
    buildClipPath,
    getSelectionBBox,
    drawRoundedRectPath
  };
})();
