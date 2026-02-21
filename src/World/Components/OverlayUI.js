import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";

export function createOverlayUI(scene) {
  const manifestOverlay = document.createElement("div");
  manifestOverlay.id = "loading-overlay";
  manifestOverlay.innerHTML = ManifestoContent;
  document.body.appendChild(manifestOverlay);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  document.body.appendChild(icon);

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  document.body.appendChild(themeDot);

  const setTheme = (themeName) => {
    document.documentElement.setAttribute("data-theme", themeName);
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

  themeDot.onclick = () => {
    const themes = ["herd", "dolphin", "void"];
    const current =
      document.documentElement.getAttribute("data-theme") || "herd";
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    setTheme(next);
  };

  icon.onclick = () => {
    manifestOverlay.classList.add("active");
  };

  document.addEventListener("click", (e) => {
    if (
      e.target.id === "manifesto-overlay-bg" ||
      e.target.id === "close-manifesto"
    ) {
      manifestOverlay.classList.remove("active");
    }
  });
}
