// app.js — application entry point. Initializes everything and coordinates
// modules. Contains no rendering logic of its own.
window.PX = window.PX || {};

document.addEventListener('DOMContentLoaded', () => {
  PX.renderer.init(document.getElementById('workspace'));
  PX.ui.init();
});
