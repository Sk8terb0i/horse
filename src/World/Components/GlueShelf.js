import gsap from "gsap";

export function initGlueShelf(currentUsername, showMemory, onToggle) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  const savedFolderPos = JSON.parse(
    localStorage.getItem("glue_folder_pos"),
  ) || { top: "20vh", left: "10vw" };
  const getPos = (val) => (typeof val === "number" ? val + "px" : val);

  const savedWindowPos = JSON.parse(
    localStorage.getItem("glue_window_pos"),
  ) || { top: 200, left: 200 };

  // Separated Running State (in taskbar) vs Visible State (on screen)
  let isAppRunning = localStorage.getItem("shelf_expanded") === "true";
  let isWindowVisible = isAppRunning;

  const folderIcon = document.createElement("div");
  folderIcon.id = "glue-folder-standalone";
  folderIcon.style.cssText = `
    position: fixed; top: ${getPos(savedFolderPos.top)}; left: ${getPos(savedFolderPos.left)}; 
    z-index: 5000; cursor: pointer; display: ${currentUsername ? "block" : "none"}; 
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  folderIcon.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="width: 55px; height: 65px; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));">
        <svg viewBox="0 0 100 120" width="100%" height="100%">
          <defs>
            <linearGradient id="bottle-body" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
              <stop offset="50%" stop-color="#e0e0e0" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9" />
            </linearGradient>
            <linearGradient id="glue-cap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff9900" />
              <stop offset="100%" stop-color="#cc3300" />
            </linearGradient>
          </defs>
          <path d="M40,20 L60,20 L55,5 L45,5 Z" fill="#ffffff" stroke="#ccc" stroke-width="1"/>
          <rect x="35" y="20" width="30" height="15" rx="2" fill="url(#glue-cap)" />
          <path d="M30,35 L70,35 Q85,35 85,50 L85,100 Q85,115 70,115 L30,115 Q15,115 15,100 L15,50 Q15,35 30,35 Z" fill="url(#bottle-body)" stroke="rgba(255,255,255,0.5)" stroke-width="1" />
          <path d="M25,50 L25,100" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.6" />
          <rect x="25" y="60" width="50" height="30" rx="2" fill="rgba(0,114,255,0.15)" stroke="rgba(0,114,255,0.3)" />
        </svg>
      </div>
      <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: 2px;">Glue</span>
    </div>
  `;

  folderIcon.onmouseenter = () => (folderIcon.style.transform = "scale(1.15)");
  folderIcon.onmouseleave = () => (folderIcon.style.transform = "scale(1)");

  const vistaWindow = document.createElement("div");
  vistaWindow.className = "vista-window shelf-window";
  vistaWindow.style.cssText = `
    display: ${isWindowVisible ? "flex" : "none"}; 
    visibility: ${isWindowVisible ? "visible" : "hidden"}; 
    opacity: ${isWindowVisible ? 1 : 0};
    transform: ${isWindowVisible ? "scale(1)" : "scale(0.9) translateY(10px)"};
    position: fixed; top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px; 
    width: 320px; height: 400px; z-index: 5001; flex-direction: column;
    pointer-events: ${isWindowVisible ? "auto" : "none"};
  `;

  vistaWindow.innerHTML = `
    <div class="vista-title-bar" id="shelf-drag-handle" style="cursor: move; user-select: none;">
      <div class="vista-title">Glue Shelf</div>
      
      <div style="display: flex; gap: 6px; align-items: center;">
        <div id="shelf-minimize-btn" style="width: 24px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05)); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; transition: background 0.2s;">
          <div style="width: 10px; height: 2px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.5);"></div>
        </div>
        
        <div id="shelf-close-btn" style="width: 38px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%); cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3);">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));"></path></svg>
        </div>
      </div>
    </div>
    <div class="vista-content-area" id="shelf-items-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 20px; overflow-y: auto; flex-grow: 1;">
    </div>
  `;

  document.body.appendChild(folderIcon);
  document.body.appendChild(vistaWindow);

  // --- WINDOW MANAGEMENT ---
  const bringToFront = () => {
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 5001) + 1;
    vistaWindow.style.zIndex = window.__highestVistaZIndex;
  };
  vistaWindow.addEventListener("mousedown", bringToFront);

  const glueIconSVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
      <rect x="35" y="20" width="30" height="15" rx="2" fill="%23ff9900" />
      <path d="M30,35 L70,35 Q85,35 85,50 L85,100 Q85,115 70,115 L30,115 Q15,115 15,100 L15,50 Q15,35 30,35 Z" fill="%23ffffff" />
      <rect x="25" y="60" width="50" height="30" rx="2" fill="%230072ff" opacity="0.2" />
    </svg>
  `)}`;

  const syncTaskbar = () => {
    if (window.TaskbarAPI) {
      window.TaskbarAPI.updateApp(
        "glue-shelf",
        "Glue Shelf",
        glueIconSVG,
        isAppRunning,
        isWindowVisible,
        () => {
          isWindowVisible = !isWindowVisible;
          if (isWindowVisible) bringToFront();
          animateWindow(isWindowVisible);
          syncTaskbar();
          if (onToggle) onToggle(isWindowVisible);
        },
      );
    }
  };
  setTimeout(syncTaskbar, 100);

  const animateWindow = (show) => {
    if (show) {
      vistaWindow.style.display = "flex";
      vistaWindow.style.pointerEvents = "auto";
    }
    gsap.to(vistaWindow, {
      duration: 0.4,
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.9,
      y: show ? 0 : 10,
      visibility: show ? "visible" : "hidden",
      ease: "back.out(1.7)",
      onComplete: () => {
        if (!show) {
          vistaWindow.style.display = "none";
          vistaWindow.style.pointerEvents = "none";
        }
      },
    });
  };

  const makeDraggable = (el, handle, saveKey) => {
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;
    const move = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!wasDragged && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        wasDragged = true;
        el.style.transition = "none";
      }
      if (wasDragged) {
        el.style.left = initialLeft + dx + "px";
        el.style.top = initialTop + dy + "px";
        if (el === vistaWindow) checkBounds();
      }
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      if (wasDragged) {
        if (el === folderIcon)
          el.style.transition =
            "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        localStorage.setItem(
          saveKey,
          JSON.stringify({ top: el.offsetTop, left: el.offsetLeft }),
        );
        setTimeout(() => {
          wasDragged = false;
        }, 50);
      }
    };
    handle.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      wasDragged = false;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
    return () => wasDragged;
  };

  const folderStatus = makeDraggable(folderIcon, folderIcon, "glue_folder_pos");

  const checkBounds = () => {
    const rect = vistaWindow.getBoundingClientRect();
    if (rect.right > window.innerWidth)
      vistaWindow.style.left = window.innerWidth - rect.width - 20 + "px";
  };

  // Keep the window draggable logic
  makeDraggable(
    vistaWindow,
    vistaWindow.querySelector("#shelf-drag-handle"),
    "glue_window_pos",
  );

  const makeIconDraggable = (iconEl, saveKey, clickCallback) => {
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;

    iconEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); // Kills the text highlight/native drag issue
      document.body.style.userSelect = "none";

      startX = e.clientX;
      startY = e.clientY;
      const rect = iconEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      isDragging = true;
      wasDragged = false;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          wasDragged = true;
          iconEl.style.transition = "none";
        }

        if (wasDragged) {
          iconEl.style.left = initialLeft + dx + "px";
          iconEl.style.top = initialTop + dy + "px";
          iconEl.style.right = "auto";
          iconEl.style.bottom = "auto";
        }
      };

      const onMouseUp = (upEvent) => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (wasDragged) {
          iconEl.style.transition =
            "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
          const finalRect = iconEl.getBoundingClientRect();
          const safeLeft = Math.max(
            0,
            Math.min(finalRect.left, window.innerWidth - 64),
          );
          const safeTop = Math.max(
            0,
            Math.min(finalRect.top, window.innerHeight - 64),
          );

          const vwPos = (safeLeft / window.innerWidth) * 100;
          const vhPos = (safeTop / window.innerHeight) * 100;

          const relativePos = { left: vwPos + "vw", top: vhPos + "vh" };
          iconEl.style.left = relativePos.left;
          iconEl.style.top = relativePos.top;

          localStorage.setItem(saveKey, JSON.stringify(relativePos));
        } else {
          if (clickCallback) clickCallback(e);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  };

  makeIconDraggable(folderIcon, "glue_folder_pos", (e) => {
    isAppRunning = true;
    isWindowVisible = true;
    localStorage.setItem("shelf_expanded", "true");

    bringToFront();
    animateWindow(true);
    syncTaskbar();
    if (onToggle) onToggle(true);
  });

  // --- CUSTOM MINIMIZE BUTTON LOGIC ---
  const minBtn = vistaWindow.querySelector("#shelf-minimize-btn");
  minBtn.onmouseenter = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))");
  minBtn.onmouseleave = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))");
  minBtn.onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false; // Minimizes but stays in taskbar
    animateWindow(false);
    syncTaskbar();
    if (onToggle) onToggle(false);
  };

  // --- CSS CLOSE BUTTON LOGIC ---
  const closeBtn = vistaWindow.querySelector("#shelf-close-btn");
  closeBtn.onmouseenter = () => {
    closeBtn.style.background =
      "linear-gradient(180deg, rgba(255,120,120,0.95) 0%, rgba(230,50,50,1) 49%, rgba(200,20,20,1) 50%, rgba(250,70,70,1) 100%)";
    closeBtn.style.boxShadow =
      "inset 0 1px 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,50,50,0.6)";
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.background =
      "linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%)";
    closeBtn.style.boxShadow =
      "inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3)";
  };
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    isAppRunning = false;
    isWindowVisible = false;
    localStorage.setItem("shelf_expanded", "false");

    animateWindow(false);
    syncTaskbar();
    if (onToggle) onToggle(false);
  };

  const shelfStyles = document.createElement("style");
  shelfStyles.innerHTML = `
    .shelf-window .vista-content-area { background: url('${ASSET_PATH}glue_bg.jpg') center/cover no-repeat !important; }
    .aero-plus-card { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:15px; cursor:pointer; border-radius:8px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); background:rgba(255, 255, 255, 0.1); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(5px); }
    .aero-plus-card:hover { background: rgba(255, 255, 255, 0.4) !important; transform: translateY(-5px) scale(1.02) !important; box-shadow: 0 10px 20px rgba(0,0,0,0.2); border-color: rgba(255, 255, 255, 0.8) !important; }
    .aero-plus-card:active { transform: translateY(0) scale(0.98) !important; }
    .aero-plus-icon { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #a8ff78 0%, #08fbff 100%); border:3px solid white; color:white; font-size:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; transition: transform 0.2s ease; }
    .aero-plus-card:hover .aero-plus-icon { transform: rotate(90deg) scale(1.1); }
  `;
  document.head.appendChild(shelfStyles);

  return {
    folderIcon,
    wrapper: vistaWindow,
    isExpanded: () => isWindowVisible,
    update: (usersData) => {
      const container = document.getElementById("shelf-items-container");
      if (!container) return;
      container.innerHTML = "";
      const plusCard = document.createElement("div");
      plusCard.className = "aero-plus-card";
      plusCard.innerHTML = `<div class="aero-plus-icon">+</div><span style="font-size:10px; color:#003366; font-weight:bold; text-transform:uppercase; font-family: sans-serif; margin-top:8px;">NEW GLUE</span>`;
      plusCard.onclick = () => (window.location.hash = "#/ritual");
      container.appendChild(plusCard);
      usersData.forEach((user) => {
        if (user.manifestations) {
          Object.entries(user.manifestations).forEach(([id, data]) => {
            if (data.isBottled && data.finalImage) {
              const item = document.createElement("div");
              item.className = "aero-plus-card";
              item.innerHTML = `<img src="${data.finalImage}" style="width:50px; height:50px; object-fit:contain; filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.3));"><span style="font-size:10px; color:#000; margin-top:8px; font-family:serif; background:rgba(255,255,255,0.6); padding:2px 4px; border-radius:4px;">${data.name || "glue"}</span>`;
              item.onclick = () => showMemory(data.name || id, data.config);
              container.appendChild(item);
            }
          });
        }
      });
    },
  };
}
