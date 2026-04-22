import gsap from "gsap";

export function createMemoryModal() {
  const ASSET_PATH = import.meta.env.BASE_URL + "GlueFactoryAssets/";
  const BASE_ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // State tracking for the Taskbar
  let isAppRunning = false;
  let isWindowVisible = false;
  let currentMemoryName = "Memory";

  // Create the free-floating Win95 Window
  const windowEl = document.createElement("div");
  windowEl.id = "memory-drag-container";
  windowEl.style.cssText = `
    position: fixed; top: 10vh; left: 15vw; 
    background: #c0c0c0; border: 2px outset #fff; padding: 3px; 
    display: none; flex-direction: column; 
    box-shadow: 10px 10px 40px rgba(0,0,0,0.6); 
    width: 70vw; height: 500px; min-width: 400px; 
    z-index: 5001; resize: both; overflow: hidden;
    opacity: 0; transform: scale(0.8); pointer-events: none;
  `;

  windowEl.innerHTML = `
    <div id="memory-title-handle" style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-family: 'MS Sans Serif', Arial, sans-serif; font-size: 12px; display: flex; justify-content: space-between; align-items: center; cursor: move; user-select: none;">
      <span id="memory-title-text">Memory Viewer</span>
      <div style="display: flex; gap: 2px; align-items: center;">
        <button id="memory-minimize-btn" style="cursor: pointer; background: #c0c0c0; border: 2px outset #fff; padding: 0; width: 16px; height: 14px; font-weight: bold; font-family: 'MS Sans Serif', monospace; font-size: 10px; display: flex; align-items: center; justify-content: center; color: black; line-height: 1; transition: background 0.1s ease;">_</button>
        <button id="memory-close-btn" style="cursor: pointer; background: #c0c0c0; border: 2px outset #fff; padding: 0; width: 16px; height: 14px; font-weight: bold; font-family: 'MS Sans Serif', sans-serif; font-size: 9px; display: flex; align-items: center; justify-content: center; color: black; line-height: 1; transition: background 0.1s ease;">X</button>
      </div>
    </div>
    <div id="memory-content-area" style="flex-grow: 1; width: 100%; position: relative; background-image: url('${ASSET_PATH}bg_dressup_room.jpg'); background-size: cover; background-position: center; border: 2px inset #fff; margin-top: 3px; overflow: hidden;">
    </div>
  `;

  document.body.appendChild(windowEl);

  windowEl.addEventListener("pointerdown", (e) => e.stopPropagation());
  windowEl.addEventListener("click", (e) => e.stopPropagation());

  const bringToFront = () => {
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 5001) + 1;
    windowEl.style.zIndex = window.__highestVistaZIndex;
  };
  windowEl.addEventListener("mousedown", bringToFront);

  const syncTaskbar = () => {
    if (window.TaskbarAPI) {
      window.TaskbarAPI.updateApp(
        "memory-viewer",
        `Memory: ${currentMemoryName}`,
        `${BASE_ASSET_PATH}folder.png`,
        isAppRunning,
        isWindowVisible,
        () => {
          isWindowVisible = !isWindowVisible;
          if (isWindowVisible) bringToFront();
          animateWindow(isWindowVisible);
          syncTaskbar();
        },
      );
    }
  };

  const animateWindow = (show) => {
    if (show) {
      windowEl.style.display = "flex";
      windowEl.style.pointerEvents = "auto";
    }
    gsap.to(windowEl, {
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.8,
      duration: 0.3,
      ease: show ? "back.out(1.2)" : "power2.in",
      onComplete: () => {
        if (!show) {
          windowEl.style.display = "none";
          windowEl.style.pointerEvents = "none";
        }
      },
    });
  };

  const minBtn = windowEl.querySelector("#memory-minimize-btn");
  const closeBtn = windowEl.querySelector("#memory-close-btn");

  [minBtn, closeBtn].forEach((btn) => {
    btn.onmouseenter = () => (btn.style.background = "#dcdcdc");
    btn.onmouseleave = () => {
      btn.style.background = "#c0c0c0";
      btn.style.border = "2px outset #fff";
    };
    btn.onmousedown = (e) => {
      e.stopPropagation();
      btn.style.border = "2px inset #fff";
      btn.style.background = "#a9a9a9";
    };
    btn.onmouseup = () => {
      btn.style.border = "2px outset #fff";
      btn.style.background = "#dcdcdc";
    };
  });

  minBtn.onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false;
    animateWindow(false);
    syncTaskbar();
  };
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    isAppRunning = false;
    isWindowVisible = false;
    animateWindow(false);
    syncTaskbar();
  };

  const handle = windowEl.querySelector("#memory-title-handle");
  let mx = 0,
    my = 0;
  handle.onmousedown = (e) => {
    mx = e.clientX - windowEl.offsetLeft;
    my = e.clientY - windowEl.offsetTop;
    const move = (me) => {
      windowEl.style.left = me.clientX - mx + "px";
      windowEl.style.top = me.clientY - my + "px";
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };

  const showMemory = (name, config) => {
    currentMemoryName = name;
    windowEl.querySelector("#memory-title-text").innerText =
      `Memory of ${name}`;
    const formatCoord = (val) =>
      String(val).includes("%") || String(val).includes("px") ? val : val + "%";
    windowEl.querySelector("#memory-content-area").innerHTML = config
      .map((p) => {
        const isBack = p.category && p.category.includes("_back");
        return `<img src="${ASSET_PATH}${p.file}" style="position:absolute; left:${formatCoord(p.x)}; top:${formatCoord(p.y)}; transform:translate(-50%, -50%) scale(${p.scale || 0.7}) rotate(${p.rotate || 0}deg); z-index:${p.zIndex || 10}; pointer-events:none; ${isBack ? "filter: brightness(0.7);" : ""}">`;
      })
      .join("");

    isAppRunning = true;
    isWindowVisible = true;
    bringToFront();
    animateWindow(true);
    syncTaskbar();
  };

  return { showMemory };
}
