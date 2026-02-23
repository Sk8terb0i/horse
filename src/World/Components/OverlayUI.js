import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";
import { doc, setDoc } from "firebase/firestore";
import { createThemeUI } from "./ThemeUI.js";
import { createColorPicker } from "./ColorPickerUI.js";

const getNearestColorName = (hex) => {
  // 1. The full library
  const library = {
    "#ffffff": "stark white",
    "#f0f8ff": "alice blue",
    "#faebd7": "antique white",
    "#00ffff": "cyan",
    "#7fffd4": "aquamarine",
    "#f0ffff": "azure",
    "#f5f5dc": "beige",
    "#ffe4c4": "bisque",
    "#000000": "obsidian",
    "#0000ff": "royal blue",
    "#8a2be2": "blue violet",
    "#a52a2a": "brown",
    "#deb887": "burlywood",
    "#5f9ea0": "cadet blue",
    "#7fff00": "chartreuse",
    "#d2691e": "chocolate",
    "#ff7f50": "coral",
    "#6495ed": "cornflower blue",
    "#fff8dc": "cornsilk",
    "#dc143c": "crimson",
    "#00008b": "dark blue",
    "#008b8b": "dark cyan",
    "#b8860b": "dark goldenrod",
    "#a9a9a9": "dark gray",
    "#006400": "dark green",
    "#bdb76b": "dark khaki",
    "#8b008b": "dark magenta",
    "#556b2f": "dark olive green",
    "#ff8c00": "dark orange",
    "#9932cc": "dark orchid",
    "#8b0000": "dark red",
    "#e9967a": "darksalmon",
    "#8fbc8f": "dark sea green",
    "#483d8b": "dark slate blue",
    "#2f4f4f": "dark slate gray",
    "#00ced1": "dark turquoise",
    "#9400d3": "dark violet",
    "#ff1493": "deep pink",
    "#00bfff": "deep sky blue",
    "#696969": "dim gray",
    "#1e90ff": "dodger blue",
    "#b22222": "fire brick",
    "#fffaf0": "floral white",
    "#228b22": "forest green",
    "#ff00ff": "fuchsia",
    "#dcdcdc": "gainsboro",
    "#f8f8ff": "ghost white",
    "#ffd700": "gold",
    "#daa520": "goldenrod",
    "#808080": "gray",
    "#008000": "green",
    "#adff2f": "green yellow",
    "#f0fff0": "honeydew",
    "#ff69b4": "hot pink",
    "#cd5c5c": "indian red",
    "#4b0082": "indigo",
    "#fffff0": "ivory",
    "#f0e68c": "khaki",
    "#e6e6fa": "lavender",
    "#fff0f5": "lavender blush",
    "#7cfc00": "lawn green",
    "#fffacd": "lemon chiffon",
    "#add8e6": "light blue",
    "#f08080": "light coral",
    "#e0ffff": "light cyan",
    "#fafad2": "light goldenrod yellow",
    "#d3d3d3": "light gray",
    "#90ee90": "light green",
    "#ffb6c1": "light pink",
    "#ffa07a": "light salmon",
    "#20b2aa": "light sea green",
    "#87cefa": "light sky blue",
    "#778899": "light slate gray",
    "#b0c4de": "light steel blue",
    "#ffffe0": "light yellow",
    "#00ff00": "lime",
    "#32cd32": "lime green",
    "#faf0e6": "linen",
    "#800000": "maroon",
    "#66cdaa": "medium aquamarine",
    "#0000cd": "medium blue",
    "#ba55d3": "medium orchid",
    "#9370db": "medium purple",
    "#3cb371": "medium sea green",
    "#7b68ee": "medium slate blue",
    "#00fa9a": "medium spring green",
    "#48d1cc": "medium turquoise",
    "#c71585": "medium violet red",
    "#191970": "midnight blue",
    "#f5fffa": "mint cream",
    "#ffe4e1": "misty rose",
    "#ffe4b5": "moccasin",
    "#ffdead": "navajo white",
    "#000080": "navy",
    "#fdf5ff": "old lace",
    "#808000": "olive",
    "#6b8e23": "olive drab",
    "#ffa500": "orange",
    "#ff4500": "orange red",
    "#da70d6": "orchid",
    "#eee8aa": "pale goldenrod",
    "#98fb98": "pale green",
    "#afeeee": "pale turquoise",
    "#db7093": "pale violet red",
    "#ffefd5": "papaya whip",
    "#ffdab9": "peach puff",
    "#cd853f": "peru",
    "#ffc0cb": "pink",
    "#dda0dd": "plum",
    "#b0e0e6": "powder blue",
    "#800080": "purple",
    "#663399": "rebecca purple",
    "#ff0000": "red",
    "#bc8f8f": "rosy brown",
    "#4169e1": "royal blue",
    "#8b4513": "saddle brown",
    "#fa8072": "salmon",
    "#f4a460": "sandy brown",
    "#2e8b57": "sea green",
    "#fff5ee": "seashell",
    "#a0522d": "sienna",
    "#c0c0c0": "silver",
    "#87ceeb": "sky blue",
    "#6a5acd": "slate blue",
    "#708090": "slate gray",
    "#fffafa": "snow",
    "#00ff7f": "spring green",
    "#4682b4": "steel blue",
    "#d2b48c": "tan",
    "#008080": "teal",
    "#d8bfd8": "thistle",
    "#ff6347": "tomato",
    "#40e0d0": "turquoise",
    "#ee82ee": "violet",
    "#f5deb3": "wheat",
    "#f5f5f5": "white smoke",
    "#ffff00": "yellow",
    "#9acd32": "yellow green",
  };

  // 2. Helper to convert hex to RGB
  const hexToRgb = (h) => {
    const fullHex =
      h.length === 4 ? "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
    const r = parseInt(fullHex.substring(1, 3), 16);
    const g = parseInt(fullHex.substring(3, 5), 16);
    const b = parseInt(fullHex.substring(5, 7), 16);
    return { r, g, b };
  };

  const target = hexToRgb(hex);
  let minDistance = Infinity;
  let bestName = "this shade";

  // 3. Mathematical distance check
  for (const [libHex, name] of Object.entries(library)) {
    const libRgb = hexToRgb(libHex);
    const distance = Math.sqrt(
      Math.pow(target.r - libRgb.r, 2) +
        Math.pow(target.g - libRgb.g, 2) +
        Math.pow(target.b - libRgb.b, 2),
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestName = name;
    }
  }

  return bestName;
};

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
