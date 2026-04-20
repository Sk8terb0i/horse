import gsap from "gsap";
import * as THREE from "three";

export function createTaskbar(scene) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // 1. THE TASKBAR BASE
  const bar = document.createElement("div");
  bar.id = "vista-taskbar";
  bar.style.cssText = `
    position: fixed; bottom: 0; left: 0; width: 100%; height: 32px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%);
    backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
    border-top: 1px solid rgba(255,255,255,0.15); z-index: 6000;
    display: flex; align-items: center; padding: 0 12px; box-sizing: border-box;
    box-shadow: 0 -1px 5px rgba(0,0,0,0.3);
  `;

  // 2. SYSTEM TRAY (Right Side Container)
  const systemTray = document.createElement("div");
  systemTray.style.cssText = `
    margin-left: auto; display: flex; align-items: center; gap: 10px;
    font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: white;
  `;

  // Clock
  const timeDisplay = document.createElement("div");
  timeDisplay.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
  const updateTime = () => {
    const now = new Date();
    timeDisplay.innerText = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  setInterval(updateTime, 1000);
  updateTime();

  // 3. THE SMALL THEME ORB (Right of Time)
  const themeOrb = document.createElement("div");
  themeOrb.id = "tray-theme-orb";
  themeOrb.style.cssText = `
    width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
    border: 1.5px solid rgba(255, 255, 255, 0.6); position: relative;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden; box-shadow: 0 0 5px rgba(0,0,0,0.5);
  `;

  // Glossy reflection overlay for the orb
  const shine = document.createElement("div");
  shine.style.cssText = `
    position: absolute; top: 1px; left: 3px; width: 12px; height: 7px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
    border-radius: 50% 50% 40% 40%; pointer-events: none;
  `;
  themeOrb.appendChild(shine);

  // Append items to tray: Time FIRST, then Orb
  systemTray.appendChild(timeDisplay);
  systemTray.appendChild(themeOrb);
  bar.appendChild(systemTray);

  // 4. THEME FLYOUT MENU
  const themeMenu = document.createElement("div");
  themeMenu.id = "theme-flyout-menu";
  themeMenu.style.cssText = `
    position: absolute; bottom: 38px; right: 10px; width: 170px;
    background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px; box-shadow: 0 5px 25px rgba(0,0,0,0.6);
    display: none; opacity: 0; transform: translateY(10px) scale(0.9);
    flex-direction: column; gap: 3px; padding: 6px;
  `;

  const themes = [
    {
      id: "void",
      name: "Void",
      color: "#ac6ef7",
      grad: "radial-gradient(circle at 30% 30%, #ac6ef7, #4b0082 70%, #000)",
    },
    {
      id: "dolphin pov",
      name: "Dolphin POV",
      color: "#21dff0",
      grad: "radial-gradient(circle at 30% 30%, #21dff0, #0059b3 70%, #001a33)",
    },
    {
      id: "lone",
      name: "Lone",
      color: "#ffffff",
      grad: "radial-gradient(circle at 30% 30%, #ffffff, #888 70%, #222)",
    },
    {
      id: "herd",
      name: "Herd",
      color: "#9ece27",
      grad: "radial-gradient(circle at 30% 30%, #9ece27, #4b6b00 70%, #1a2400)",
    },
  ];

  const tileElements = {};
  themes.forEach((t) => {
    const btn = document.createElement("div");
    btn.style.cssText = `
      padding: 8px 10px; color: white; cursor: pointer; border-radius: 4px;
      display: flex; align-items: center; gap: 8px; font-family: 'Segoe UI', sans-serif;
      font-size: 12px; transition: 0.2s ease; background: rgba(255,255,255,0.05);
      border: 1px solid transparent;
    `;
    btn.innerHTML = `<div style="width:8px; height:8px; border-radius:50%; background:${t.color}; border:1px solid white; box-shadow: 0 0 3px ${t.color};"></div><span>${t.name}</span>`;

    btn.onclick = (e) => {
      e.stopPropagation();
      setTheme(t);
      toggleMenu(false);
    };

    btn.onmouseenter = () => {
      if (document.documentElement.getAttribute("data-theme") !== t.id) {
        btn.style.background = "rgba(255,255,255,0.15)";
        btn.style.transform = "translateX(-3px)";
      }
    };
    btn.onmouseleave = () => {
      if (document.documentElement.getAttribute("data-theme") !== t.id) {
        btn.style.background = "rgba(255,255,255,0.05)";
        btn.style.transform = "translateX(0)";
      }
    };

    tileElements[t.id] = btn;
    themeMenu.appendChild(btn);
  });

  bar.appendChild(themeMenu);
  document.body.appendChild(bar);

  // --- LOGIC ---
  let isOpen = false;
  const toggleMenu = (state) => {
    isOpen = state !== undefined ? state : !isOpen;
    if (isOpen) {
      themeMenu.style.display = "flex";
      gsap.to(themeMenu, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to(themeMenu, {
        opacity: 0,
        y: 10,
        scale: 0.9,
        duration: 0.2,
        onComplete: () => (themeMenu.style.display = "none"),
      });
    }
  };

  const setTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t.id);
    localStorage.setItem("horse_herd_theme", t.id);

    // Update Orb Color to represent selection
    themeOrb.style.background = t.grad;
    themeOrb.style.boxShadow = `0 0 8px ${t.color}`;

    // Update Menu Selection Indication
    Object.keys(tileElements).forEach((id) => {
      tileElements[id].style.background =
        id === t.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)";
      tileElements[id].style.borderColor =
        id === t.id ? "rgba(255,255,255,0.5)" : "transparent";
    });

    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim();
    gsap.to(scene.background, { ...new THREE.Color(bgColor), duration: 1.5 });
  };

  themeOrb.onclick = (e) => {
    e.stopPropagation();
    toggleMenu();
  };
  themeOrb.onmouseenter = () => {
    themeOrb.style.transform = "scale(1.2)";
  };
  themeOrb.onmouseleave = () => {
    themeOrb.style.transform = "scale(1)";
  };

  window.addEventListener("click", () => {
    if (isOpen) toggleMenu(false);
  });

  const savedThemeId = localStorage.getItem("horse_herd_theme") || "lone";
  setTheme(themes.find((t) => t.id === savedThemeId));

  return bar;
}
