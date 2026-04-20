import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";
import { doc, setDoc } from "firebase/firestore";
import { createThemeUI } from "./ThemeUI.js";
import { createColorPicker } from "./ColorPickerUI.js";
import { getNearestColorName } from "../Utils/ColorUtils.js";

export function createOverlayUI(scene, db, getUsername) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  const uiContainer = document.createElement("div");
  uiContainer.id = "logged-in-ui";
  uiContainer.style.display = "none";
  uiContainer.style.transition = "opacity 0.8s ease";
  uiContainer.style.pointerEvents = "none";
  document.body.appendChild(uiContainer);

  // --- 1. MANIFESTO OVERLAY SETUP (VISTA WINDOW) ---
  const manifestOverlay = document.createElement("div");
  manifestOverlay.id = "loading-overlay";

  // REFINED RE-WRAPPER: Handles multiline content and filters out empty space highlights
  const processedContent = ManifestoContent.replace(
    /<div id="close-manifesto".*?><\/div>/g,
    "",
  )
    .replace(
      /<h2>([\s\S]*?)<\/h2>/g,
      '<h2 class="aero-header-text"><span>$1</span></h2>',
    )
    .replace(
      /<strong>([\s\S]*?)<\/strong>/g,
      '<strong class="aero-header-text"><span>$1</span></strong>',
    )
    .replace(/<p>([\s\S]*?)<\/p>/g, (match, p1) => {
      // If the paragraph is empty, just a space, or a line break, don't highlight it
      if (!p1.trim() || p1 === "<br>" || p1 === "&nbsp;") return "";
      return `<p><span class="aero-body-text">${p1}</span></p>`;
    });

  manifestOverlay.innerHTML = `
    <div class="vista-window">
      <div class="vista-title-bar">
        <div class="vista-title">The Manifesto of the Herd</div>
        <img src="${ASSET_PATH}aero_close.png" id="aero-close" alt="Close">
      </div>
      <div class="vista-content-area">
        ${processedContent}
      </div>
    </div>
  `;
  document.body.appendChild(manifestOverlay);

  manifestOverlay.addEventListener("click", (e) => {
    if (e.target.id === "aero-close") {
      manifestOverlay.classList.remove("active");
      uiContainer.style.opacity = "1";
      uiContainer.style.pointerEvents = "auto";
    }
  });

  manifestOverlay.addEventListener("pointerdown", (e) => e.stopPropagation());

  // --- 2. FRUTIGER AERO STYLES ---
  const aeroStyle = document.createElement("style");
  aeroStyle.innerHTML = `
    #loading-overlay {
      display: none;
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 10, 30, 0.5); 
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
    }

    #loading-overlay.active { display: flex !important; justify-content: center; align-items: center; }

    .vista-window {
      width: 90vw; max-width: 850px; height: 85vh;
      background: rgba(255, 255, 255, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: 8px;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.4);
      overflow: hidden;
      animation: vista-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .vista-title-bar {
      height: 32px; flex-shrink: 0;
      background: linear-gradient(to bottom, #338cff 0%, #0066cc 50%, #0059b3 51%, #0078d7 100%);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 10px; border-bottom: 1px solid #003366;
    }

    .vista-title { color: white; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 13px; font-weight: 500; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
    #aero-close { height: 26px; cursor: pointer; transition: transform 0.1s; }
    #aero-close:hover { filter: brightness(1.2); }

    .vista-content-area {
      flex-grow: 1; 
      padding: 20px 50px 10px 50px; /* REDUCED TOP PADDING TO FIX DEAD SPACE */
      overflow-y: auto;
      background: url('${ASSET_PATH}aero_bg.jpg') center/cover no-repeat;
      color: #000 !important;
    }

    /* VISTA SCROLLBAR */
    .vista-content-area::-webkit-scrollbar { width: 14px; }
    .vista-content-area::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); }
    .vista-content-area::-webkit-scrollbar-thumb { 
      background: linear-gradient(to right, #f8f8f8, #dcdcdc); 
      border-radius: 10px; border: 3px solid transparent; background-clip: content-box;
      box-shadow: inset 0 0 2px rgba(0,0,0,0.2);
    }

    /* HIGHLIGHTER SYSTEM */
    .aero-body-text {
      display: inline !important;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone; 
      background-color: #ff66cc !important;
      color: #000 !important;
      font-family: 'Segoe UI', Arial, sans-serif !important;
      padding: 2px 6px;
      font-size: 15px; font-weight: 600;
    }

    /* FIX: Ensure empty spans or whitespace-only spans don't render a background */
    .aero-body-text:empty { display: none !important; }

    .vista-content-area .aero-header-text span {
      background-color: #ffff00 !important;
      color: #000 !important;
      display: inline !important;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      padding: 4px 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .vista-content-area p, .vista-content-area h2 {
      background: transparent !important;
      line-height: 1.8 !important; 
      margin-bottom: 20px !important;
      display: block !important;
    }

    @keyframes vista-pop {
      from { transform: scale(0.85) translateY(30px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(aeroStyle);

  // --- 3. LANDING PAGE UI ELEMENTS ---
  const userContainer = document.createElement("div");
  userContainer.id = "user-identity-block";
  userContainer.style.cssText = `
    position: fixed; top: 30px; right: 30px; 
    display: flex; flex-direction: row-reverse; 
    align-items: center; z-index: 5001; pointer-events: none;
    gap: 15px;
  `;
  uiContainer.appendChild(userContainer);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  // FIX: Force the container to center the oversized icon perfectly
  icon.style.cssText = `
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible; /* Allows the 48px icon to sit over the 30px CSS circle */
  `;
  icon.innerHTML = `<img src="${ASSET_PATH}manifesto_btn.png" alt="Manifesto" style="height: 48px; width: auto; display: block; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">`;
  userContainer.appendChild(icon);

  icon.onmouseenter = () => {
    icon.style.transform = "scale(1.1) translateY(-2px)";
    icon.style.filter =
      "brightness(1.1) drop-shadow(0 0 8px rgba(255,255,255,0.8))";
  };
  icon.onmouseleave = () => {
    icon.style.transform = "scale(1) translateY(0px)";
    icon.style.filter = "none";
  };
  icon.onclick = (e) => {
    e.stopPropagation();
    manifestOverlay.classList.add("active");
    uiContainer.style.opacity = "0";
    uiContainer.style.pointerEvents = "none";
  };

  const logoutBtn = document.createElement("div");
  logoutBtn.id = "logout-btn";
  logoutBtn.style.cssText = `
    display: flex; align-items: center; justify-content: center;
    opacity: 0.3; cursor: pointer; transition: opacity 0.3s ease;
    pointer-events: auto;
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
  usernameDisplay.style.pointerEvents = "auto";
  userContainer.appendChild(usernameDisplay);

  logoutBtn.onmouseenter = () => (logoutBtn.style.opacity = "1");
  logoutBtn.onmouseleave = () => (logoutBtn.style.opacity = "0.3");
  logoutBtn.onclick = () => {
    localStorage.removeItem("horse_herd_username");
    sessionStorage.removeItem("horse_herd_username");
    window.location.reload();
  };

  const themeMenu = createThemeUI(scene);
  uiContainer.appendChild(themeMenu);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  innerHorseDot.style.cssText = `
    position: fixed; top: 75px; right: 38px; 
    width: 14px; height: 14px; border-radius: 50%; 
    background: transparent; cursor: pointer; z-index: 5001; 
    transition: all 0.3s ease, opacity 0.5s ease; 
    opacity: 0; border: 1px solid rgba(255,255,255,0.2); pointer-events: auto;
  `;
  uiContainer.appendChild(innerHorseDot);

  const promptText = document.createElement("div");
  promptText.id = "color-prompt";
  promptText.style.cssText = `
    position: fixed; top: 100px; right: 40px; 
    writing-mode: vertical-rl; text-orientation: mixed; 
    font-size: 10px; color: #fff; letter-spacing: 1px;
    opacity: 0; pointer-events: none; z-index: 5001;
    display: none; transition: opacity 0.5s ease;
  `;
  uiContainer.appendChild(promptText);

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
    const username = getUsername();
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

  const hoofbeatPaths = [
    ASSET_PATH + "hoofbeat1.wav",
    ASSET_PATH + "hoofbeat2.wav",
    ASSET_PATH + "hoofbeat3.wav",
    ASSET_PATH + "hoofbeat4.wav",
    ASSET_PATH + "hoofbeat5.wav",
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
    hoofbeatAudios[randomIndex].currentTime = 0;
    hoofbeatAudios[randomIndex].play().catch(() => {});
  };

  document.addEventListener("mousedown", () => playRandomHoofbeat());

  return {
    showMainUI: () => {
      uiContainer.style.display = "block";
      setTimeout(() => {
        uiContainer.style.opacity = "1";
      }, 10);
      soundsActive = true;
      innerHorseDot.opacity = "1";
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
