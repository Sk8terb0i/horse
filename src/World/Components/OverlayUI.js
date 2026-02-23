import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";
import { doc, setDoc } from "firebase/firestore";
import { createThemeUI } from "./ThemeUI.js";
import { createColorPicker } from "./ColorPickerUI.js";
import { getNearestColorName } from "../Utils/ColorUtils.js";

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
  icon.id = "manifesto-icon";
  uiContainer.appendChild(icon);

  const usernameDisplay = document.createElement("div");
  usernameDisplay.id = "user-display-name";
  uiContainer.appendChild(usernameDisplay);

  const themeMenu = createThemeUI(scene);
  uiContainer.appendChild(themeMenu);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  innerHorseDot.style.cssText = `
    position: fixed; top: 110px; right: 38px; width: 14px; height: 14px; 
    border-radius: 50%; background: transparent; cursor: pointer; z-index: 5001; 
    transition: all 0.3s ease, opacity 0.5s ease; box-sizing: border-box; opacity: 0;
  `;
  uiContainer.appendChild(innerHorseDot);

  const promptText = document.createElement("div");
  promptText.id = "color-prompt";
  promptText.style.cssText = `
    position: fixed; top: 135px; right: 40px; writing-mode: vertical-rl; 
    text-orientation: mixed; font-size: 10px; color: #fff; letter-spacing: 1px;
    opacity: 0; pointer-events: none; text-transform: lowercase; z-index: 5001;
    display: none; transition: opacity 0.5s ease;
  `;
  uiContainer.appendChild(promptText);

  const getReminderPhrase = (currentColor) => {
    const lastUpdate = localStorage.getItem("inner_horse_color_last_updated");
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const colorName = getNearestColorName(currentColor);

    if (!lastUpdate || now - lastUpdate > threeDays) {
      const phrases = [
        "is your inner horse still galloping with its color?",
        "time for a change?",
        `hay there, still feeling ${colorName}?`,
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
    return null;
  };

  const picker = createColorPicker(async (newColor) => {
    innerHorseDot.style.background = newColor;
    promptText.style.opacity = "0";
    setTimeout(() => {
      promptText.style.display = "none";
    }, 500);

    const username = localStorage.getItem("horse_herd_username");
    if (username) {
      try {
        const userRef = doc(db, "users", username);
        await setDoc(userRef, { innerColor: newColor }, { merge: true });
        localStorage.setItem("inner_horse_color_last_updated", Date.now());
      } catch (err) {
        console.error(err);
      }
    }
  });
  document.body.appendChild(picker.element);

  innerHorseDot.onclick = (e) => {
    e.stopPropagation();
    const isVisible = picker.element.style.display === "block";
    isVisible ? picker.hide() : picker.show();
  };

  document.addEventListener("mousedown", (e) => {
    if (!picker.element.contains(e.target) && e.target !== innerHorseDot) {
      picker.hide();
    }
  });

  icon.onclick = () => manifestOverlay.classList.add("active");

  return {
    showMainUI: () => {
      uiContainer.style.display = "block";
    },
    setInitialColor: (color) => {
      innerHorseDot.style.opacity = "1";
      const actualColor = color || "#ffffff";
      innerHorseDot.style.background = actualColor;

      const phrase = getReminderPhrase(actualColor);
      if (phrase) {
        promptText.innerText = phrase;
        promptText.style.display = "block";
        setTimeout(() => {
          promptText.style.opacity = "0.5";
        }, 10);
      } else {
        promptText.style.display = "none";
      }
    },
    setUsername: (name) => {
      if (name) usernameDisplay.innerText = name;
    },
  };
}
