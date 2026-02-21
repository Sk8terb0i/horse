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

  // The dynamic label (replaces the hint)
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
  let hasInteracted = false;

  const setTheme = (themeName) => {
    const current = document.documentElement.getAttribute("data-theme");

    // Update label text immediately during drag
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

  themeDot.onmousedown = (e) => {
    isDragging = true;
    themeDot.style.cursor = "grabbing";
    // add class to body to disable all text selection
    document.body.classList.add("is-dragging");

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;

      const x = moveEvent.clientX / window.innerWidth;
      const y = moveEvent.clientY / window.innerHeight;

      // move the dot visually
      const deltaX = moveEvent.clientX - (window.innerWidth - 45);
      const deltaY = moveEvent.clientY - (window.innerHeight - 33);
      themeDot.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      if (x < 0.5 && y < 0.5) setTheme("void");
      else if (x >= 0.5 && y < 0.5) setTheme("dolphin");
      else if (x < 0.5 && y >= 0.5) setTheme("lone");
      else if (x >= 0.5 && y >= 0.5) setTheme("herd");
    };

    const onMouseUp = () => {
      isDragging = false;
      themeDot.style.cursor = "grab";
      // remove class to restore normal behavior
      document.body.classList.remove("is-dragging");

      gsap.to(themeDot, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.6)",
      });

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Set initial state
  const savedTheme = localStorage.getItem("horse_herd_theme") || "herd";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeLabel.innerText = savedTheme;

  return container;
}
