// exportImage.js
// Handles image export only.

window.PX = window.PX || {};

PX.exportImage = (function () {
    const state = PX.state;

    function downloadBlob(blob, filename) {
        if (!blob) {
            console.error("Failed to create image blob.");
            return;
        }

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function renderCanvas() {
        const canvas = document.createElement("canvas");

        canvas.width = state.sourceWidth;
        canvas.height = state.sourceHeight;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            state.source,
            0,
            0,
            canvas.width,
            canvas.height
        );

        if (state.pixelateEntire) {
            PX.pixelator.pixelateEntireCanvas(
                ctx,
                canvas.width,
                canvas.height,
                state.pixelSize
            );
        } else {
            state.selections.forEach(selection => {
                PX.pixelator.pixelateSelection(
                    ctx,
                    canvas,
                    selection,
                    state.pixelSize
                );
            });
        }

        return canvas;
    }

    function exportImage(format = "png", onDone = null) {

        const mime =
            format === "jpg"
                ? "image/jpeg"
                : "image/png";

        const extension =
            format === "jpg"
                ? "jpg"
                : "png";

        const canvas = renderCanvas();

        canvas.toBlob(blob => {

            if (!blob) {
                console.error("Image export failed.");
                return;
            }

            downloadBlob(
                blob,
                `pixelated.${extension}`
            );

            if (typeof onDone === "function") {
                onDone();
            }

        }, mime, 0.92);
    }

    return {
        exportImage
    };

})();
