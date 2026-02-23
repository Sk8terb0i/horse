import gsap from "gsap";
import * as THREE from "three";

export function createThemeUI(scene) {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 38px;
    z-index: 5001;
    display: flex;
    align-items: center;
    gap: 15px;
  `;

  const themeLabel = document.createElement("div");
  themeLabel.id = "theme-display-label";
  themeLabel.innerText = "drag around to change color";
  themeLabel.style.cssText = `
    font-family: serif;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: lowercase;
    color: var(--text-main);
    opacity: 0.6;
    pointer-events: none;
    transition: opacity 0.3s ease, color 0.3s ease;
    white-space: nowrap;
    font-style: italic;
  `;
  container.appendChild(themeLabel);

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  themeDot.style.cssText = `
    position: relative;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: var(--accent-white);
    cursor: grab;
    border: 1.5px solid rgba(255,255,255,0.2);
    transition: transform 0.1s ease;
    touch-action: none; 
  `;
  container.appendChild(themeDot);

  let isDragging = false;

  const setTheme = (themeName) => {
    const current = document.documentElement.getAttribute("data-theme");
    themeLabel.innerText = themeName;
    themeLabel.style.opacity = "1";

    if (current === themeName) return;

    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("horse_herd_theme", themeName);

    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim() || "#000000";
    const newBg = new THREE.Color(bgColor);

    gsap.to(scene.background, {
      r: newBg.r,
      g: newBg.g,
      b: newBg.b,
      duration: 0.8,
      ease: "power2.out",
    });
  };

  const startDrag = (e) => {
    isDragging = true;
    themeDot.style.cursor = "grabbing";
    document.body.classList.add("is-dragging");

    const onMove = (moveEvent) => {
      if (!isDragging) return;

      // support both mouse and touch coordinates
      const clientX = moveEvent.touches
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const clientY = moveEvent.touches
        ? moveEvent.touches[0].clientY
        : moveEvent.clientY;

      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;

      // move the dot visually (adjusted for standard layout offsets)
      const deltaX = clientX - (window.innerWidth - 45);
      const deltaY = clientY - (window.innerHeight - 33);
      themeDot.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      if (x < 0.5 && y < 0.5) setTheme("void");
      else if (x >= 0.5 && y < 0.5) setTheme("dolphin pov");
      else if (x < 0.5 && y >= 0.5) setTheme("lone");
      else if (x >= 0.5 && y >= 0.5) setTheme("herd");
    };

    const endDrag = () => {
      isDragging = false;
      themeDot.style.cursor = "grab";
      document.body.classList.remove("is-dragging");

      gsap.to(themeDot, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.6)",
      });

      // cleanup all listeners
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", endDrag);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", endDrag);
  };

  // bind both events
  themeDot.addEventListener("mousedown", startDrag);
  themeDot.addEventListener("touchstart", startDrag, { passive: false });

  const savedTheme = localStorage.getItem("horse_herd_theme") || "lone";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeLabel.innerText = savedTheme;

  return container;
}
