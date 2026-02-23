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

  // 1. MAIN RIGHT-ALIGNED BLOCK
  const userContainer = document.createElement("div");
  userContainer.id = "user-identity-block";
  userContainer.style.cssText = `
    position: fixed; 
    top: 30px; 
    right: 30px; 
    display: flex; 
    flex-direction: row-reverse; 
    align-items: center; 
    z-index: 5001;
    pointer-events: none;
  `;
  uiContainer.appendChild(userContainer);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  icon.style.cssText = `
    position: static !important; 
    margin: 0;
    pointer-events: auto;
  `;
  userContainer.appendChild(icon);

  const logoutBtn = document.createElement("div");
  logoutBtn.id = "logout-btn";
  logoutBtn.style.cssText = `
    display: flex; 
    align-items: center; 
    justify-content: center;
    opacity: 0.3; 
    cursor: pointer; 
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: auto;
    margin-left: 8px;
    margin-right: 20px;
  `;
  logoutBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  `;
  userContainer.appendChild(logoutBtn);

  const usernameDisplay = document.createElement("div");
  usernameDisplay.id = "user-display-name";
  usernameDisplay.style.cssText = `
    position: static !important;
    color: #fff; 
    font-size: 11px; 
    letter-spacing: 1.5px;
    pointer-events: auto;
    text-transform: none; 
    margin: 0;
  `;
  userContainer.appendChild(usernameDisplay);

  // 2. INTERACTION LOGIC
  logoutBtn.onmouseenter = () => {
    logoutBtn.style.opacity = "1";
    logoutBtn.style.transform = "translateX(-2px)";
  };
  logoutBtn.onmouseleave = () => {
    logoutBtn.style.opacity = "0.3";
    logoutBtn.style.transform = "translateX(0px)";
  };
  logoutBtn.onclick = () => {
    localStorage.removeItem("horse_herd_username");
    sessionStorage.removeItem("horse_herd_username");
    window.location.reload();
  };

  icon.onclick = (e) => {
    e.stopPropagation();
    manifestOverlay.classList.add("active");
    uiContainer.style.opacity = "0";
  };

  // 3. THEME & DOTS
  const themeMenu = createThemeUI(scene);
  uiContainer.appendChild(themeMenu);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  innerHorseDot.style.cssText = `
    position: fixed; 
    top: 75px; 
    right: 38px; 
    width: 14px; 
    height: 14px; 
    border-radius: 50%; 
    background: transparent; 
    cursor: pointer; 
    z-index: 5001; 
    transition: all 0.3s ease, opacity 0.5s ease, transform 0.3s ease; 
    box-sizing: border-box; 
    opacity: 0;
    border: 1px solid rgba(255,255,255,0.2);
  `;
  uiContainer.appendChild(innerHorseDot);

  // HOVER FOR INNER HORSE DOT
  innerHorseDot.onmouseenter = () => {
    innerHorseDot.style.transform = "scale(1.2)";
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
    position: fixed; 
    top: 100px; 
    right: 40px; 
    writing-mode: vertical-rl; 
    text-orientation: mixed; 
    font-size: 10px; 
    color: #fff; 
    letter-spacing: 1px;
    opacity: 0; 
    pointer-events: none; 
    z-index: 5001;
    display: none; 
    transition: opacity 0.5s ease;
  `;
  uiContainer.appendChild(promptText);

  // 4. AUDIO SETUP
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

  let soundsActive = false;
  let lastSoundIndex = -1;

  const playRandomHoofbeat = () => {
    if (!soundsActive) return;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * hoofbeatAudios.length);
    } while (randomIndex === lastSoundIndex);
    lastSoundIndex = randomIndex;
    const selectedAudio = hoofbeatAudios[randomIndex];
    selectedAudio.currentTime = 0;
    selectedAudio.play().catch(() => {});
  };

  document.addEventListener("mousedown", () => {
    playRandomHoofbeat();
  });

  // 5. COLOR PICKER LOGIC
  const updateLabel = (color) => {
    promptText.innerText = getNearestColorName(color);
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
    const username =
      localStorage.getItem("horse_herd_username") ||
      sessionStorage.getItem("horse_herd_username");
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
    if (picker.element.style.display === "block") {
      picker.hide();
      promptText.style.opacity = "0.5";
    } else {
      picker.show();
      promptText.style.opacity = "0";
    }
  };

  // 6. THEME DOT HOVERS RESTORED
  const applyThemeDotHovers = () => {
    // looking for the theme dots specifically inside the theme menu
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

  // run once after setup
  setTimeout(applyThemeDotHovers, 100);

  return {
    showMainUI: () => {
      uiContainer.style.display = "block";
      soundsActive = true;
      innerHorseDot.style.opacity = "1";
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
