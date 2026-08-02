// ui.js — DOM event wiring only: buttons, sliders, toolbar, and translating
// pointer/touch events on the canvas into selection.js calls. No drawing here.
window.PX = window.PX || {};

PX.ui = (function () {
  const state = PX.state;
  let canvas;

  function $(id) { return document.getElementById(id); }

  function init() {
    canvas = PX.renderer.getCanvas();

    $('fileInput').addEventListener('change', handleFileInput);

    document.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
    });

    $('modeEntire').addEventListener('click', () => setMode(true));
    $('modeRegion').addEventListener('click', () => setMode(false));

    $('pixelSize').addEventListener('input', (e) => {
      state.pixelSize = parseInt(e.target.value, 10);
      $('pixelSizeLabel').textContent = state.pixelSize;
    });

    $('cornerRadius').addEventListener('input', (e) => {
      const sel = state.selections.find((s) => s.id === state.selectedId);
      if (sel && sel.type === 'roundedRect') sel.cornerRadius = parseInt(e.target.value, 10);
    });

    $('deleteSelection').addEventListener('click', deleteSelected);
    $('finishPolygon').addEventListener('click', finishPolygon);

    $('playPause').addEventListener('click', togglePlay);
    $('preserveAudio').addEventListener('change', (e) => { state.preserveAudio = e.target.checked; });

    $('exportPng').addEventListener('click', () => PX.exporter.exportImage('png'));
    $('exportJpg').addEventListener('click', () => PX.exporter.exportImage('jpg'));
    $('exportWebm').addEventListener('click', exportVideoFlow);

    setupCanvasInteraction();
    setMode(true);
    setActiveTool('rectangle');
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;
    PX.fileLoader.loadFile(file, () => {
      PX.renderer.resizeToSource();
      $('emptyState').style.display = 'none';
      $('canvasWrap').style.display = 'flex';
      $('videoControls').style.display = state.mode === 'video' ? 'flex' : 'none';
      $('exportWebm').style.display = state.mode === 'video' ? 'inline-flex' : 'none';
      $('exportPng').style.display = state.mode === 'image' ? 'inline-flex' : 'none';
      $('exportJpg').style.display = state.mode === 'image' ? 'inline-flex' : 'none';
      PX.renderer.startLoop();
    });
  }

  function setActiveTool(tool) {
    state.currentTool = tool;
    document.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    $('cornerRadiusRow').style.display = tool === 'roundedRect' ? 'flex' : 'none';
    $('finishPolygon').style.display = tool === 'polygon' ? 'inline-flex' : 'none';
    cancelPolygonDraft();
  }

  function setMode(entire) {
    state.pixelateEntire = entire;
    $('modeEntire').classList.toggle('active', entire);
    $('modeRegion').classList.toggle('active', !entire);
    $('selectionTools').style.display = entire ? 'none' : 'flex';
    $('regionHint').style.display = entire ? 'none' : 'block';
  }

  function deleteSelected() {
    state.selections = state.selections.filter((s) => s.id !== state.selectedId);
    state.selectedId = null;
  }

  function cancelPolygonDraft() {
    state.draftPolygon = null;
    state.isDrawingPolygon = false;
  }

  function finishPolygon() {
    if (state.draftPolygon && state.draftPolygon.points.length >= 3) {
      const sel = { id: PX.utils.generateId(), type: 'polygon', points: state.draftPolygon.points };
      state.selections.push(sel);
      state.selectedId = sel.id;
    }
    cancelPolygonDraft();
  }

  function togglePlay() {
    const video = state.source;
    if (!video) return;
    if (video.paused) { video.play(); $('playPause').textContent = '⏸ Pause'; }
    else { video.pause(); $('playPause').textContent = '▶ Play'; }
  }

  function exportVideoFlow() {
    $('exportWebm').disabled = true;
    $('exportWebm').textContent = 'Recording…';
    PX.exporter.exportVideo(
      { preserveAudio: state.preserveAudio },
      {
        onProgress: (p) => { $('exportWebm').textContent = `Recording… ${Math.round(p * 100)}%`; },
        onDone: () => {
          $('exportWebm').disabled = false;
          $('exportWebm').textContent = 'Export WebM';
          PX.renderer.startLoop();
        },
        onError: () => {
          $('exportWebm').disabled = false;
          $('exportWebm').textContent = 'Export WebM';
          alert('Video export is not supported on this browser.');
        }
      }
    );
  }

  // --- Pointer interaction on the canvas (mouse + touch via Pointer Events) ---
  function setupCanvasInteraction() {
    let dragTarget = null; // 'move' | handle name | null
    let dragSel = null;
    let lastX = 0, lastY = 0;

    function toCanvasCoords(evt) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
      };
    }

    canvas.addEventListener('pointerdown', (evt) => {
      if (state.pixelateEntire || !state.source) return;
      const { x, y } = toCanvasCoords(evt);

      if (state.currentTool === 'polygon') {
        if (!state.draftPolygon) { state.draftPolygon = { points: [] }; state.isDrawingPolygon = true; }
        state.draftPolygon.points.push({ x, y });
        return;
      }

      const selected = state.selections.find((s) => s.id === state.selectedId);
      if (selected) {
        const handle = PX.selection.getHandleAt(selected, x, y);
        if (handle) {
          dragTarget = handle; dragSel = selected; lastX = x; lastY = y;
          canvas.setPointerCapture(evt.pointerId);
          return;
        }
      }

      const hit = PX.selection.findAt(state.selections, x, y);
      if (hit) {
        state.selectedId = hit.id;
        dragTarget = 'move'; dragSel = hit; lastX = x; lastY = y;
        canvas.setPointerCapture(evt.pointerId);
        syncCornerRadiusInput(hit);
      } else {
        const newSel = PX.selection.createSelection(state.currentTool, x, y);
        state.selections.push(newSel);
        state.selectedId = newSel.id;
        dragTarget = 'move'; dragSel = newSel; lastX = x; lastY = y;
        canvas.setPointerCapture(evt.pointerId);
        syncCornerRadiusInput(newSel);
      }
    });

    canvas.addEventListener('pointermove', (evt) => {
      if (!dragTarget || !dragSel) return;
      const { x, y } = toCanvasCoords(evt);
      const dx = x - lastX, dy = y - lastY;
      if (dragTarget === 'move') PX.selection.move(dragSel, dx, dy);
      else PX.selection.resize(dragSel, dragTarget, dx, dy, x, y);
      lastX = x; lastY = y;
    });

    function endDrag(evt) {
      dragTarget = null;
      dragSel = null;
      try { canvas.releasePointerCapture(evt.pointerId); } catch (e) { /* no-op */ }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // Double-tap / double-click closes an in-progress polygon.
    canvas.addEventListener('dblclick', () => {
      if (state.currentTool === 'polygon' && state.draftPolygon) finishPolygon();
    });
  }

  function syncCornerRadiusInput(sel) {
    if (sel.type === 'roundedRect') $('cornerRadius').value = sel.cornerRadius;
  }

  return { init };
})();
