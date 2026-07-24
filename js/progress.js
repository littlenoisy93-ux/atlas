window.AtlasScratchpad = (() => {
  const canvas = document.getElementById("pad");
  const padWrap = document.getElementById("padWrap");
  const context = canvas.getContext("2d");

  let drawing = false;
  let paths = [];
  let currentPath = [];

  function resizeCanvas() {
    const rectangle = padWrap.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(rectangle.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rectangle.height * pixelRatio));

    canvas.style.width = rectangle.width + "px";
    canvas.style.height = rectangle.height + "px";

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#24394a";
    context.lineWidth = 2.2;

    redraw();
  }

  function pointerPosition(event) {
    const rectangle = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rectangle.left,
      y: event.clientY - rectangle.top
    };
  }

  function redraw() {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    for (const path of paths) {
      if (path.length < 2) continue;

      context.beginPath();
      context.moveTo(path[0].x, path[0].y);

      for (let index = 1; index < path.length; index += 1) {
        context.lineTo(path[index].x, path[index].y);
      }

      context.stroke();
    }
  }

  canvas.addEventListener("pointerdown", event => {
    drawing = true;
    currentPath = [pointerPosition(event)];
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener("pointermove", event => {
    if (!drawing) return;

    const point = pointerPosition(event);
    const previous = currentPath[currentPath.length - 1];

    currentPath.push(point);

    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    event.preventDefault();
  });

  function finishDrawing(event) {
    if (!drawing) return;

    drawing = false;

    if (currentPath.length) {
      paths.push(currentPath);
    }

    currentPath = [];
    event.preventDefault();
  }

  canvas.addEventListener("pointerup", finishDrawing);
  canvas.addEventListener("pointercancel", finishDrawing);

  document.getElementById("clear").addEventListener("click", () => {
    paths = [];
    redraw();
  });

  document.getElementById("undo").addEventListener("click", () => {
    paths.pop();
    redraw();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(padWrap);
  } else {
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  window.addEventListener("orientationchange", () => {
    setTimeout(resizeCanvas, 250);
  });

  return { redraw };
})();

