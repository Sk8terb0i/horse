import gsap from "gsap";
import * as THREE from "three";

export function createThemeUI(scene) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // --- THEME DATA & GRADIENTS ---
  const themes = [
    {
      id: "void",
      name: "Void",
      color: "#ac6ef7",
      orbGradient:
        "radial-gradient(circle at 30% 30%, #ac6ef7, #4b0082 70%, #000000 100%)",
      glow: "rgba(172, 110, 247, 0.6)",
    },
    {
      id: "dolphin pov",
      name: "Dolphin POV",
      color: "#21dff0",
      orbGradient:
        "radial-gradient(circle at 30% 30%, #21dff0, #0059b3 70%, #001a33 100%)",
      glow: "rgba(33, 223, 240, 0.6)",
    },
    {
      id: "lone",
      name: "Lone",
      color: "#ffffff",
      orbGradient:
        "radial-gradient(circle at 30% 30%, #ffffff, #888888 70%, #222222 100%)",
      glow: "rgba(255, 255, 255, 0.5)",
    },
    {
      id: "herd",
      name: "Herd",
      color: "#9ece27",
      orbGradient:
        "radial-gradient(circle at 30% 30%, #9ece27, #4b6b00 70%, #1a2400 100%)",
      glow: "rgba(158, 206, 39, 0.6)",
    },
  ];

  // 1. MAIN CONTAINER
  const container = document.createElement("div");
  container.id = "vista-theme-container";
  container.style.cssText = `
    position: fixed; bottom: 25px; right: 38px; z-index: 5005;
    display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 15px;
  `;

  // 2. THE VISTA ORB (Start Button)
  const themeOrb = document.createElement("div");
  themeOrb.id = "theme-orb-trigger";
  themeOrb.style.cssText = `
    width: 46px; height: 46px; border-radius: 50%; cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255,255,255,0.2);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative; overflow: hidden;
  `;

  // The glassy reflection layer
  const reflection = document.createElement("div");
  reflection.style.cssText = `
    position: absolute; top: 2px; left: 8px; width: 30px; height: 18px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
    border-radius: 50% 50% 40% 40%; pointer-events: none; z-index: 2;
  `;
  themeOrb.appendChild(reflection);

  // 3. THE FLYOUT MENU (Aero Glass Pane)
  const themeMenu = document.createElement("div");
  themeMenu.id = "theme-flyout-menu";
  themeMenu.style.cssText = `
    width: 190px; background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255,255,255,0.2);
    padding: 12px; display: none; opacity: 0; transform: translateY(20px) scale(0.9);
    flex-direction: column; gap: 8px; pointer-events: none;
  `;

  // Create Tiles
  const tileElements = {};
  themes.forEach((theme) => {
    const btn = document.createElement("div");
    btn.className = "theme-tile";
    btn.style.cssText = `
      padding: 10px 14px; color: white; font-family: 'Segoe UI', Tahoma, sans-serif;
      font-size: 13px; cursor: pointer; border-radius: 6px; transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; gap: 12px; position: relative;
    `;

    btn.innerHTML = `
      <div style="width: 12px; height: 12px; border-radius: 50%; background: ${theme.color}; border: 1.5px solid white; box-shadow: 0 0 5px ${theme.color};"></div>
      <span style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${theme.name}</span>
    `;

    btn.onclick = (e) => {
      e.stopPropagation();
      setTheme(theme.id);
      toggleMenu(false);
    };

    btn.onmouseenter = () => {
      if (document.documentElement.getAttribute("data-theme") !== theme.id) {
        btn.style.background = "rgba(255, 255, 255, 0.25)";
        btn.style.borderColor = "rgba(255, 255, 255, 0.5)";
        btn.style.transform = "translateX(-6px)";
      }
    };
    btn.onmouseleave = () => {
      if (document.documentElement.getAttribute("data-theme") !== theme.id) {
        btn.style.background = "rgba(255, 255, 255, 0.05)";
        btn.style.borderColor = "rgba(255,255,255,0.1)";
        btn.style.transform = "translateX(0)";
      }
    };

    tileElements[theme.id] = btn;
    themeMenu.appendChild(btn);
  });

  container.appendChild(themeMenu);
  container.appendChild(themeOrb);

  // --- LOGIC ---

  const setTheme = (themeName) => {
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("horse_herd_theme", themeName);

    // Update Orb Color
    const themeData = themes.find((t) => t.id === themeName);
    if (themeData) {
      themeOrb.style.background = themeData.orbGradient;
      themeOrb.style.boxShadow = `0 0 15px rgba(0,0,0,0.5), 0 0 20px ${themeData.glow}`;
    }

    // Update Tile Selection UI
    Object.keys(tileElements).forEach((id) => {
      const tile = tileElements[id];
      if (id === themeName) {
        tile.style.background = "rgba(255, 255, 255, 0.4)";
        tile.style.borderColor = "rgba(255, 255, 255, 0.8)";
        tile.style.boxShadow = "inset 0 0 10px rgba(255,255,255,0.3)";
        tile.style.fontWeight = "bold";
      } else {
        tile.style.background = "rgba(255, 255, 255, 0.05)";
        tile.style.borderColor = "rgba(255,255,255,0.1)";
        tile.style.boxShadow = "none";
        tile.style.fontWeight = "normal";
      }
    });

    // Animate Background
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim() || "#000000";
    const newBg = new THREE.Color(bgColor);

    gsap.to(scene.background, {
      r: newBg.r,
      g: newBg.g,
      b: newBg.b,
      duration: 1.5,
      ease: "power2.inOut",
    });
  };

  const toggleMenu = (forceState) => {
    isOpen = forceState !== undefined ? forceState : !isOpen;
    if (isOpen) {
      themeMenu.style.display = "flex";
      gsap.to(themeMenu, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        ease: "back.out(1.7)",
        onStart: () => {
          themeMenu.style.pointerEvents = "auto";
        },
      });
    } else {
      gsap.to(themeMenu, {
        opacity: 0,
        y: 20,
        scale: 0.9,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          themeMenu.style.display = "none";
          themeMenu.style.pointerEvents = "none";
        },
      });
    }
  };

  let isOpen = false;
  themeOrb.onclick = (e) => {
    e.stopPropagation();
    toggleMenu();
  };
  window.addEventListener("click", () => {
    if (isOpen) toggleMenu(false);
  });

  // Orb Hover
  themeOrb.onmouseenter = () => {
    themeOrb.style.transform = "scale(1.15) rotate(10deg)";
    themeOrb.style.filter = "brightness(1.1)";
  };
  themeOrb.onmouseleave = () => {
    themeOrb.style.transform = "scale(1) rotate(0deg)";
    themeOrb.style.filter = "brightness(1)";
  };

  // Initial Sync
  const savedTheme = localStorage.getItem("horse_herd_theme") || "lone";
  setTheme(savedTheme);

  return container;
}
