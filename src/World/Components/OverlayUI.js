import * as THREE from "three";
import gsap from "gsap";
import { ManifestoContent } from "./Content.js";
import { doc, setDoc } from "firebase/firestore";

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

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  uiContainer.appendChild(themeDot);

  const innerHorseDot = document.createElement("div");
  innerHorseDot.id = "inner-horse-dot";
  // changed right to 38px and ensured box-sizing is consistent
  innerHorseDot.style.cssText = `
    position: fixed; 
    top: 110px; 
    right: 38px; 
    width: 14px; 
    height: 14px; 
    border-radius: 50%; 
    background: #fff; 
    cursor: pointer; 
    z-index: 5001; 
    transition: all 0.3s ease;
    box-sizing: border-box; 
  `;
  uiContainer.appendChild(innerHorseDot);

  const promptText = document.createElement("div");
  promptText.id = "color-prompt";
  promptText.innerText = "choose your inner horse";
  promptText.style.cssText = `
    position: fixed; 
    top: 135px; 
    right: 40px;
    writing-mode: vertical-rl; 
    text-orientation: mixed;
    font-size: 10px; 
    color: #fff; 
    letter-spacing: 1px;
    opacity: 0.5; 
    pointer-events: none; 
    text-transform: lowercase;
    z-index: 5001;
  `;
  uiContainer.appendChild(promptText);

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.style.display = "none";
  document.body.appendChild(colorInput);

  innerHorseDot.onclick = () => colorInput.click();

  // updates the UI immediately for a responsive feel
  colorInput.oninput = (e) => {
    const newColor = e.target.value;
    innerHorseDot.style.background = newColor;
    promptText.style.display = "none";
  };

  // saves to firebase only when the user finishes picking
  colorInput.onchange = async (e) => {
    const newColor = e.target.value;
    const username = localStorage.getItem("horse_herd_username");

    if (username) {
      try {
        const userRef = doc(db, "users", username);
        // merge: true handles both new users and old users missing the field
        await setDoc(
          userRef,
          {
            innerColor: newColor,
          },
          { merge: true },
        );

        console.log(
          `herd synchronization: ${username} color set to ${newColor}`,
        );
      } catch (err) {
        console.error("error syncing color to the marrow:", err);
      }
    }
  };

  const setTheme = (themeName, save = true) => {
    document.documentElement.setAttribute("data-theme", themeName);

    // persist the choice
    if (save) {
      localStorage.setItem("horse_herd_theme", themeName);
    }

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

  // initialize theme: check storage first, otherwise default to "herd"
  const savedTheme = localStorage.getItem("horse_herd_theme") || "herd";
  // pass false to 'save' so we don't redundantely write to localStorage on load
  setTheme(savedTheme, false);

  themeDot.onclick = () => {
    // added "stark" to the array
    const themes = ["herd", "dolphin", "void", "lone"];
    const current =
      document.documentElement.getAttribute("data-theme") || "lone";
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
        // hide prompt if color isn't basic white
        if (color !== "#ffffff" && color !== "rgb(255, 255, 255)") {
          promptText.style.display = "none";
        }
      }
    },
    setUsername: (name) => {
      if (name) {
        usernameDisplay.innerText = name;
      }
    },
  };
}
