import gsap from "gsap";
import * as THREE from "three";

export function createThemeUI(scene) {
  const themeContainer = document.createElement("div");
  themeContainer.id = "theme-menu-container";
  themeContainer.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 38px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
    z-index: 5001;
  `;

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  themeContainer.appendChild(themeDot);

  const themes = [
    { name: "herd", color: "#9ece27" },
    { name: "dolphin", color: "#bc163c" },
    { name: "void", color: "#ac6ef7" },
    { name: "lone", color: "#ffffff" },
  ];

  const setTheme = (themeName, save = true) => {
    document.documentElement.setAttribute("data-theme", themeName);
    if (save) localStorage.setItem("horse_herd_theme", themeName);

    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim() || "#000000";
    const newBg = new THREE.Color(bgColor);

    gsap.to(scene.background, {
      r: newBg.r,
      g: newBg.g,
      b: newBg.b,
      duration: 1.2,
      ease: "power2.inOut",
    });
  };

  const subDotWrappers = themes.map((t) => {
    const wrapper = document.createElement("div");
    wrapper.className = "theme-row";
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      cursor: pointer;
    `;

    const label = document.createElement("span");
    label.innerText = t.name;
    label.style.cssText = `
      font-family: serif;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: lowercase;
      color: var(--text-main);
      opacity: 0.7;
    `;

    const dot = document.createElement("div");
    dot.className = "theme-sub-dot";
    dot.style.cssText = `
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${t.color};
      border: 1px solid rgba(255,255,255,0.1);
    `;

    wrapper.onclick = () => setTheme(t.name);
    wrapper.appendChild(label);
    wrapper.appendChild(dot);

    // Insert before the main toggle dot
    themeContainer.insertBefore(wrapper, themeDot);
    return wrapper;
  });

  themeContainer.onmouseenter = () => {
    subDotWrappers.forEach((wrapper, i) => {
      wrapper.style.opacity = "1";
      wrapper.style.transform = "translateY(0)";
      wrapper.style.pointerEvents = "auto";
      wrapper.style.transitionDelay = `${(subDotWrappers.length - i) * 0.05}s`;
    });
  };

  themeContainer.onmouseleave = () => {
    subDotWrappers.forEach((wrapper) => {
      wrapper.style.opacity = "0";
      wrapper.style.transform = "translateY(10px)";
      wrapper.style.pointerEvents = "none";
      wrapper.style.transitionDelay = "0s";
    });
  };

  // Init theme
  const savedTheme = localStorage.getItem("horse_herd_theme") || "herd";
  setTheme(savedTheme, false);

  return themeContainer;
}
