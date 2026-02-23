export function createColorPicker(onSelect) {
  const size = 150;
  const container = document.createElement("div");
  container.id = "custom-picker-container";
  container.style.cssText = `
    position: fixed;
    top: 140px;
    right: 40px;
    width: ${size}px;
    height: ${size}px;
    z-index: 6000;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    user-select: none;
    touch-action: none;
  `;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.borderRadius = "50%";
  canvas.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  // draw the radial hue wheel
  for (let angle = 0; angle < 360; angle++) {
    const startAngle = ((angle - 2) * Math.PI) / 180;
    const endAngle = ((angle + 2) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, cx, startAngle, endAngle);
    ctx.closePath();
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    gradient.addColorStop(0, "white");
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  const handlePick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      "#" +
      ((1 << 24) | (pixel[0] << 16) | (pixel[1] << 8) | pixel[2])
        .toString(16)
        .slice(1);

    onSelect(hex);
  };

  let isPicking = false;
  container.onmousedown = (e) => {
    isPicking = true;
    handlePick(e);
  };
  window.onmousemove = (e) => {
    if (isPicking) handlePick(e);
  };
  window.onmouseup = () => {
    isPicking = false;
  };

  // mobile support
  container.ontouchstart = (e) => {
    isPicking = true;
    handlePick(e);
  };
  container.ontouchmove = (e) => {
    if (isPicking) handlePick(e);
  };
  container.ontouchend = () => {
    isPicking = false;
  };

  return {
    element: container,
    show: () => {
      container.style.display = "block";
      setTimeout(() => (container.style.opacity = "1"), 10);
    },
    hide: () => {
      container.style.opacity = "0";
      setTimeout(() => (container.style.display = "none"), 300);
    },
  };
}
