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
  uiContainer.style.transition = "opacity 0.8s ease";
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

  // setup multiple sounds
  const hoofbeatPaths = [
    "/assets/hoofbeat1.wav",
    "/assets/hoofbeat2.wav",
    "/assets/hoofbeat3.wav",
    "/assets/hoofbeat4.wav",
    "/assets/hoofbeat5.wav",
  ];

  const hoofbeatAudios = hoofbeatPaths.map((path) => {
    const audio = new Audio(path);
    audio.volume = 0.15;
    return audio;
  });

  let lastSoundIndex = -1;
  let soundsActive = false; // tracker for login status

  const playRandomHoofbeat = () => {
    if (!soundsActive) return; // ignore if not logged in

    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * hoofbeatAudios.length);
    } while (randomIndex === lastSoundIndex);

    lastSoundIndex = randomIndex;
    const selectedAudio = hoofbeatAudios[randomIndex];

    selectedAudio.currentTime = 0;
    selectedAudio.play().catch(() => {});
  };

  // listener is always present, but playRandomHoofbeat checks soundsActive
  document.addEventListener("mousedown", () => {
    playRandomHoofbeat();
  });

  const applyThemeDotHovers = () => {
    const themeDots = themeMenu.querySelectorAll(
      'div[style*="border-radius: 50%"]',
    );
    themeDots.forEach((dot) => {
      dot.style.transition = "transform 0.3s ease, opacity 0.3s ease";
      dot.style.cursor = "pointer";
      dot.onmouseenter = () => {
        dot.style.transform = "scale(1.2)";
        dot.style.opacity = "1";
      };
      dot.onmouseleave = () => {
        dot.style.transform = "scale(1)";
        dot.style.opacity = "0.7";
      };
    });
  };
  setTimeout(applyThemeDotHovers, 100);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  innerHorseDot.style.cssText = `
    position: fixed; top: 110px; right: 38px; width: 14px; height: 14px; 
    border-radius: 50%; background: transparent; cursor: pointer; z-index: 5001; 
    transition: all 0.3s ease, opacity 0.5s ease, transform 0.3s ease; box-sizing: border-box; opacity: 0;
  `;
  uiContainer.appendChild(innerHorseDot);

  innerHorseDot.onmouseenter = () => {
    innerHorseDot.style.transform = "scale(1.3)";
    if (picker.element.style.display !== "block") {
      promptText.style.opacity = "1";
    }
  };
  innerHorseDot.onmouseleave = () => {
    innerHorseDot.style.transform = "scale(1)";
    if (picker.element.style.display !== "block") {
      promptText.style.opacity = "0.5";
    }
  };

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

  const updateLabel = (color) => {
    const phrase = getReminderPhrase(color);
    promptText.innerText = phrase ? phrase : getNearestColorName(color);
    promptText.style.display = "block";

    if (picker.element.style.display !== "block") {
      setTimeout(() => {
        promptText.style.opacity = "0.5";
      }, 10);
    }
  };

  const picker = createColorPicker(async (newColor) => {
    innerHorseDot.style.background = newColor;
    updateLabel(newColor);

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
    if (isVisible) {
      picker.hide();
      promptText.style.opacity = "0.5";
    } else {
      picker.show();
      promptText.style.opacity = "0";
    }
  };

  document.addEventListener("mousedown", (e) => {
    if (!picker.element.contains(e.target) && e.target !== innerHorseDot) {
      if (picker.element.style.display === "block") {
        picker.hide();
        promptText.style.opacity = "0.5";
      }
    }
  });

  const closeManifesto = () => {
    manifestOverlay.classList.remove("active");
    uiContainer.style.opacity = "1";
  };

  icon.onclick = (e) => {
    e.stopPropagation();
    manifestOverlay.classList.add("active");
    uiContainer.style.opacity = "0";
  };

  manifestOverlay.onclick = (e) => {
    if (
      e.target === manifestOverlay ||
      e.target.classList.contains("manifesto-layout")
    ) {
      closeManifesto();
    }
  };

  const closeBtn = manifestOverlay.querySelector(".close-icon");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeManifesto();
    };
  }

  return {
    showMainUI: () => {
      uiContainer.style.display = "block";
      soundsActive = true; // activate sounds now

      innerHorseDot.style.opacity = "1";
      if (
        !innerHorseDot.style.background ||
        innerHorseDot.style.background === "transparent"
      ) {
        innerHorseDot.style.background = "#ffffff";
        updateLabel("#ffffff");
      }
    },
    setInitialColor: (color) => {
      innerHorseDot.style.opacity = "1";
      const actualColor = color || "#ffffff";
      innerHorseDot.style.background = actualColor;
      updateLabel(actualColor);
    },
    setUsername: (name) => {
      if (name) usernameDisplay.innerText = name;
    },
  };
}
