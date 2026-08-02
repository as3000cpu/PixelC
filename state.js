// state.js — the single source of truth for the whole app.
// Every other module reads from / writes to this object rather than
// keeping its own copy of anything important.
window.PX = window.PX || {};

PX.state = {
  mode: null,              // 'image' | 'video'
  source: null,            // HTMLImageElement or HTMLVideoElement
  sourceWidth: 0,
  sourceHeight: 0,

  pixelSize: 12,            // 2 = fine, 80 = blocky
  pixelateEntire: true,     // true = whole file, false = selections only

  selections: [],           // array of selection objects (see selection.js)
  selectedId: null,

  preserveAudio: true,
  currentTool: 'rectangle', // 'rectangle' | 'roundedRect' | 'circle' | 'polygon'

  draftPolygon: null,       // { points: [] } while a custom polygon is being drawn
  isDrawingPolygon: false
};
