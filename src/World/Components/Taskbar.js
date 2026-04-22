import gsap from "gsap";
import * as THREE from "three";

// NEW: Accepts onThemeChange callback
export function createTaskbar(scene, onThemeChange) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

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

  const appsContainer = document.createElement("div");
  appsContainer.id = "taskbar-apps-container";
  appsContainer.style.cssText = `display: flex; gap: 6px; flex-grow: 1; align-items: center; height: 100%;`;
  bar.appendChild(appsContainer);

  const systemTray = document.createElement("div");
  systemTray.style.cssText = `margin-left: auto; display: flex; align-items: center; gap: 10px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: white;`;

  const timeDisplay = document.createElement("div");
  timeDisplay.style.textShadow = "1px 1px 2px rgba(0,0,0,0.8)";
  const updateTime = () => {
    timeDisplay.innerText = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  setInterval(updateTime, 1000);
  updateTime();

  const themeOrb = document.createElement("div");
  themeOrb.id = "tray-theme-orb";
  themeOrb.style.cssText = `width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 1.5px solid rgba(255, 255, 255, 0.6); position: relative; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; box-shadow: 0 0 5px rgba(0,0,0,0.5);`;

  const shine = document.createElement("div");
  shine.style.cssText = `position: absolute; top: 1px; left: 3px; width: 12px; height: 7px; background: linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%); border-radius: 50% 50% 40% 40%; pointer-events: none;`;
  themeOrb.appendChild(shine);

  systemTray.appendChild(timeDisplay);
  systemTray.appendChild(themeOrb);
  bar.appendChild(systemTray);

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

  const themeDefinitions = [
    { id: "herd", name: "Herd" },
    { id: "void", name: "Void" },
    { id: "dolphin pov", name: "Dolphin POV" },
    { id: "lone", name: "Lone" },
  ];

  const themes = themeDefinitions.map((def) => {
    const dummy = document.createElement("div");
    dummy.setAttribute("data-theme", def.id);
    dummy.style.position = "absolute";
    dummy.style.visibility = "hidden";
    document.body.appendChild(dummy);
    const styles = getComputedStyle(dummy);
    let color =
      styles
        .getPropertyValue(
          def.id === "dolphin pov" ? "--accent-white" : "--big-horse-color",
        )
        .trim() || "#ffffff";
    let bgColor = styles.getPropertyValue("--bg-color").trim() || "#000000";
    document.body.removeChild(dummy);
    return {
      id: def.id,
      name: def.name,
      color: color,
      grad: `radial-gradient(circle at 30% 30%, ${color}, ${bgColor} 85%, #000)`,
    };
  });

  const tileElements = {};
  themes.forEach((t) => {
    const btn = document.createElement("div");
    btn.style.cssText = `padding: 8px 10px; color: white; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 8px; font-family: 'Segoe UI', sans-serif; font-size: 12px; transition: 0.2s ease; background: rgba(255,255,255,0.05); border: 1px solid transparent;`;
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

    if (t.id === "herd") {
      const divider = document.createElement("div");
      divider.style.cssText = `height: 1px; background: rgba(255,255,255,0.2); margin: 2px 0 4px 0; border-radius: 1px;`;
      themeMenu.appendChild(divider);
    }
  });

  bar.appendChild(themeMenu);
  document.body.appendChild(bar);

  window.TaskbarAPI = {
    updateApp: (id, title, iconSrc, isRunning, isVisible, onToggle) => {
      let btn = document.getElementById(`taskbar-btn-${id}`);
      if (!isRunning) {
        if (btn) btn.remove();
        return;
      }
      if (!btn) {
        btn = document.createElement("div");
        btn.id = `taskbar-btn-${id}`;
        btn.style.cssText = `display: flex; align-items: center; gap: 6px; padding: 0 10px; height: 24px; border-radius: 4px; cursor: pointer; color: white; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; transition: all 0.2s; border: 1px solid transparent; user-select: none;`;
        btn.innerHTML = `<img src="${iconSrc}" style="height: 14px; width: auto; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));"><span style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${title}</span>`;
        btn.onmouseenter = () => {
          if (btn.dataset.active !== "true") {
            btn.style.background = "rgba(255,255,255,0.1)";
            btn.style.borderColor = "rgba(255,255,255,0.2)";
          }
        };
        btn.onmouseleave = () => {
          if (btn.dataset.active !== "true") {
            btn.style.background = "transparent";
            btn.style.borderColor = "transparent";
          }
        };
        btn.onclick = (e) => {
          e.stopPropagation();
          onToggle();
        };
        appsContainer.appendChild(btn);
      }
      btn.dataset.active = isVisible;
      if (isVisible) {
        btn.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))";
        btn.style.border = "1px solid rgba(255, 255, 255, 0.4)";
        btn.style.boxShadow =
          "inset 0 0 5px rgba(255, 255, 255, 0.3), 0 1px 3px rgba(0,0,0,0.5)";
      } else {
        btn.style.background = "transparent";
        btn.style.border = "1px solid transparent";
        btn.style.boxShadow = "none";
      }
    },
  };

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
    themeOrb.style.background = t.grad;
    themeOrb.style.boxShadow = `0 0 8px ${t.color}`;
    Object.keys(tileElements).forEach((id) => {
      tileElements[id].style.background =
        id === t.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)";
      tileElements[id].style.borderColor =
        id === t.id ? "rgba(255,255,255,0.5)" : "transparent";
    });
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim();
    gsap.to(scene.background, { ...new THREE.Color(bgColor), duration: 1.5 });

    // TRIGGER CALLBACK FOR MAIN.JS
    if (onThemeChange) onThemeChange(t.id);
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

  const savedThemeId = localStorage.getItem("horse_herd_theme") || "herd";
  setTheme(themes.find((t) => t.id === savedThemeId));

  return bar;
}
