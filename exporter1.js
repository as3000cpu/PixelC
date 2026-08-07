// exporter.js — turns the current pixelated canvas into a downloadable file.
// Images export instantly; video export uses MediaRecorder + captureStream(),
// entirely on-device.
window.PX = window.PX || {};

PX.exporter = (function () {
  const state = PX.state;

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderStillToCanvas() {
    const clean = document.createElement('canvas');
    clean.width = state.sourceWidth;
    clean.height = state.sourceHeight;
    const ctx = clean.getContext('2d');
    ctx.drawImage(state.source, 0, 0, clean.width, clean.height);
    if (state.pixelateEntire) {
      PX.pixelator.pixelateEntireCanvas(ctx, clean.width, clean.height, state.pixelSize);
    } else {
      state.selections.forEach((sel) => PX.pixelator.pixelateSelection(ctx, clean, sel, state.pixelSize));
    }
    return clean;
  }

  function exportImage(format, onDone) {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const clean = renderStillToCanvas();
    clean.toBlob((blob) => {
      downloadBlob(blob, `pixelated.${ext}`);
      if (onDone) onDone();
    }, mime, 0.92);
  }

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // let the browser pick a default
  }

  function exportVideo(options, callbacks) {
    const { preserveAudio = true, fps = 30 } = options || {};
    const { onStart, onProgress, onDone, onError } = callbacks || {};
    const video = state.source;
    const canvas = PX.renderer.getCanvas();
    const wasLooping = video.loop;

    function restoreLoop() { video.loop = wasLooping; }

    try {
      const stream = canvas.captureStream(fps);

      if (preserveAudio && typeof video.captureStream === 'function') {
        try {
          const videoStream = video.captureStream();
          videoStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (e) {
          console.warn('Audio capture unavailable on this browser:', e);
        }
      }

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        restoreLoop();
        const blob = new Blob(chunks, { type: 'video/webm' });
        downloadBlob(blob, 'pixelated.webm');
        if (onDone) onDone();
      };

      // The video element loops during normal editing (see fileLoader.js),
      // but if it keeps looping during export the 'ended' event below never
      // fires, the recorder never stops, and nothing gets downloaded. Turn
      // looping off just for the duration of the recording.
      video.loop = false;
      video.currentTime = 0;
      video.muted = !preserveAudio;
      if (onStart) onStart();

      recorder.start();
      PX.renderer.startLoop();
      video.play();

      const onEnded = () => {
        recorder.stop();
        video.removeEventListener('ended', onEnded);
      };
      video.addEventListener('ended', onEnded);

      if (onProgress) {
        const tick = () => {
          if (recorder.state === 'recording') {
            onProgress(video.duration ? video.currentTime / video.duration : 0);
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
    } catch (err) {
      restoreLoop();
      console.error(err);
      if (onError) onError(err);
    }
  }

  return { exportImage, exportVideo };
})();
