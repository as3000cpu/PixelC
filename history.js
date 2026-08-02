// history.js — undo/redo scaffolding. Empty of app-specific commands for now;
// full wiring (selection create/move/resize/delete as commands) lands in Phase 6.
window.PX = window.PX || {};

PX.history = (function () {
  const stack = [];
  let pointer = -1;

  // A command is: { undo(), redo() }
  function push(command) {
    stack.length = pointer + 1;
    stack.push(command);
    pointer++;
  }

  function undo() {
    if (pointer < 0) return;
    stack[pointer].undo();
    pointer--;
  }

  function redo() {
    if (pointer >= stack.length - 1) return;
    pointer++;
    stack[pointer].redo();
  }

  function canUndo() { return pointer >= 0; }
  function canRedo() { return pointer < stack.length - 1; }

  return { push, undo, redo, canUndo, canRedo };
})();
