// renderer.js — responsible ONLY for drawing. Every frame:
// draw source -> apply pixelation -> draw selection overlays -> draw handles.
window.PX = window.PX || {};

PX.renderer = (function () {
  const state = PX.state;
  let canvas, ctx;
  let rafId = null;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  function resizeToSource() {
    canvas.width = state.sourceWidth;
    canvas.height = state.sourceHeight;
  }

  function drawFrame(showOverlay) {
    if (!state.source) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.source, 0, 0, canvas.width, canvas.height);

    if (state.pixelateEntire) {
      PX.pixelator.pixelateEntireCanvas(ctx, canvas.width, canvas.height, state.pixelSize);
    } else {
      state.selections.forEach((sel) => PX.pixelator.pixelateSelection(ctx, canvas, sel, state.pixelSize));
    }

    if (showOverlay) {
      state.selections.forEach((sel) => PX.selection.drawOverlay(ctx, sel, sel.id === state.selectedId));
      if (state.draftPolygon && state.draftPolygon.points.length) {
        PX.selection.drawPolygonDraft(ctx, state.draftPolygon.points);
      }
    }
  }

  function startLoop() {
    stopLoop();
    const loop = () => {
      drawFrame(true);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function getCanvas() { return canvas; }
  function getCtx() { return ctx; }

  return { init, resizeToSource, drawFrame, startLoop, stopLoop, getCanvas, getCtx };
})();
