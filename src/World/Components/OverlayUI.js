import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";
import { doc, updateDoc } from "firebase/firestore";

export function createOverlayUI(scene, db, getUsername) {
  const uiContainer = document.createElement("div");
  uiContainer.id = "logged-in-ui";
  uiContainer.style.display = "none";
  document.body.appendChild(uiContainer);

  const manifestOverlay = document.createElement("div");
  manifestOverlay.id = "loading-overlay";
  manifestOverlay.innerHTML = ManifestoContent;
  document.body.appendChild(manifestOverlay);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon"; // css now handles visibility
  uiContainer.appendChild(icon);

  const usernameDisplay = document.createElement("div");
  usernameDisplay.id = "user-display-name";
  uiContainer.appendChild(usernameDisplay);

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  uiContainer.appendChild(themeDot);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  innerHorseDot.style.cssText = `
    position: fixed; top: 110px; right: 38px; 
    width: 14px; height: 14px; border-radius: 50%; 
    background: #fff; cursor: pointer; border: 1.5px solid #fff;
    z-index: 5001; transition: all 0.3s ease;
  `;
  uiContainer.appendChild(innerHorseDot);

  const promptText = document.createElement("div");
  promptText.id = "color-prompt";
  promptText.innerText = "choose your inner horse";
  promptText.style.cssText = `
    position: fixed; top: 135px; right: 40px;
    writing-mode: vertical-rl; text-orientation: mixed;
    font-size: 10px; color: #fff; letter-spacing: 1px;
    opacity: 0.5; pointer-events: none; text-transform: lowercase;
    z-index: 5001;
  `;
  uiContainer.appendChild(promptText);

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.style.display = "none";
  document.body.appendChild(colorInput);

  innerHorseDot.onclick = () => colorInput.click();

  colorInput.oninput = async (e) => {
    const newColor = e.target.value;
    innerHorseDot.style.background = newColor;
    promptText.style.display = "none";

    const username = getUsername();
    if (username) {
      const userRef = doc(db, "users", username);
      await updateDoc(userRef, { innerColor: newColor });
    }
  };

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

  icon.onclick = () => manifestOverlay.classList.add("active");

  document.addEventListener("click", (e) => {
    if (
      e.target.id === "loading-overlay" ||
      e.target.classList.contains("close-icon")
    ) {
      manifestOverlay.classList.remove("active");
    }
  });

  return {
    showMainUI: () => {
      uiContainer.style.display = "block";
    },
    setInitialColor: (color) => {
      if (color) {
        innerHorseDot.style.background = color;
        promptText.style.display = "none";
      }
    },
    setUsername: (name) => {
      if (name) {
        usernameDisplay.innerText = name;
      }
    },
  };
}
