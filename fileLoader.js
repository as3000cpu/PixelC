// fileLoader.js — loads a user-picked image or video file and populates state.
// Contains no rendering or UI logic.
window.PX = window.PX || {};

PX.fileLoader = (function () {
  const state = PX.state;

  function loadFile(file, onReady) {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');

    // Starting fresh on a new file.
    state.selections = [];
    state.selectedId = null;
    state.draftPolygon = null;

    if (isVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.playsInline = true;
      video.addEventListener(
        'loadedmetadata',
        () => {
          state.mode = 'video';
          state.source = video;
          state.sourceWidth = video.videoWidth;
          state.sourceHeight = video.videoHeight;
          onReady();
        },
        { once: true }
      );
    } else {
      const img = new Image();
      img.onload = () => {
        state.mode = 'image';
        state.source = img;
        state.sourceWidth = img.naturalWidth;
        state.sourceHeight = img.naturalHeight;
        onReady();
      };
      img.src = url;
    }
  }

  return { loadFile };
})();
