import gsap from "gsap";

export function initGlueShelf(currentUsername, showMemory, onToggle) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  const savedFolderPos = JSON.parse(
    localStorage.getItem("glue_folder_pos"),
  ) || { top: 200, left: 100 };
  const savedWindowPos = JSON.parse(
    localStorage.getItem("glue_window_pos"),
  ) || { top: 200, left: 200 };
  let isShelfExpanded = localStorage.getItem("shelf_expanded") === "true";

  const folderIcon = document.createElement("div");
  folderIcon.id = "glue-folder-standalone";
  folderIcon.style.cssText = `
    position: fixed; top: ${savedFolderPos.top}px; left: ${savedFolderPos.left}px; 
    z-index: 5000; cursor: pointer; display: ${currentUsername ? "block" : "none"}; 
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  folderIcon.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <img src="${ASSET_PATH}folder.png" style="width: 70px; height: auto; filter: sepia(1) saturate(10) hue-rotate(245deg) brightness(0.9) drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
      <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: 0px;">Glue</span>
    </div>
  `;

  folderIcon.onmouseenter = () => (folderIcon.style.transform = "scale(1.15)");
  folderIcon.onmouseleave = () => (folderIcon.style.transform = "scale(1)");

  const vistaWindow = document.createElement("div");
  vistaWindow.className = "vista-window shelf-window";
  vistaWindow.style.cssText = `
    display: ${isShelfExpanded ? "flex" : "none"}; 
    visibility: ${isShelfExpanded ? "visible" : "hidden"}; 
    opacity: ${isShelfExpanded ? 1 : 0};
    transform: ${isShelfExpanded ? "scale(1)" : "scale(0.9) translateY(10px)"};
    position: fixed; top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px; 
    width: 320px; height: 400px; z-index: 5001; flex-direction: column;
    pointer-events: ${isShelfExpanded ? "auto" : "none"};
  `;

  vistaWindow.innerHTML = `
    <div class="vista-title-bar" id="shelf-drag-handle" style="cursor: move; user-select: none;">
      <div class="vista-title">Glue Shelf</div>
      <img src="${ASSET_PATH}aero_close.png" id="shelf-close-btn" style="height: 22px; cursor: pointer; transition: filter 0.2s;">
    </div>
    <div class="vista-content-area" id="shelf-items-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 20px; overflow-y: auto; flex-grow: 1;">
    </div>
  `;

  document.body.appendChild(folderIcon);
  document.body.appendChild(vistaWindow);

  // --- Z-INDEX MANAGEMENT ---
  const bringToFront = () => {
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 5001) + 1;
    vistaWindow.style.zIndex = window.__highestVistaZIndex;
  };
  vistaWindow.addEventListener("mousedown", bringToFront);
  // --------------------------

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
  makeDraggable(
    vistaWindow,
    vistaWindow.querySelector("#shelf-drag-handle"),
    "glue_window_pos",
  );

  folderIcon.addEventListener("click", () => {
    if (folderStatus()) return;
    isShelfExpanded = !isShelfExpanded;
    localStorage.setItem("shelf_expanded", isShelfExpanded);
    if (isShelfExpanded) bringToFront(); // Bring to front when opening
    animateWindow(isShelfExpanded);
    if (onToggle) onToggle(isShelfExpanded);
  });

  vistaWindow.querySelector("#shelf-close-btn").onclick = (e) => {
    e.stopPropagation();
    isShelfExpanded = false;
    localStorage.setItem("shelf_expanded", "false");
    animateWindow(false);
    if (onToggle) onToggle(false);
  };

  const shelfStyles = document.createElement("style");
  shelfStyles.innerHTML = `
    .shelf-window .vista-content-area { background: url('${ASSET_PATH}glue_bg.jpg') center/cover no-repeat !important; }
    .aero-plus-card { 
      display:flex; flex-direction:column; align-items:center; justify-content:center; 
      padding:15px; cursor:pointer; border-radius:8px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background:rgba(255, 255, 255, 0.1); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(5px); 
    }
    .aero-plus-card:hover { background: rgba(255, 255, 255, 0.4) !important; transform: translateY(-5px) scale(1.02) !important; box-shadow: 0 10px 20px rgba(0,0,0,0.2); border-color: rgba(255, 255, 255, 0.8) !important; }
    .aero-plus-card:active { transform: translateY(0) scale(0.98) !important; }
    .aero-plus-icon { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #a8ff78 0%, #08fbff 100%); border:3px solid white; color:white; font-size:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; transition: transform 0.2s ease; }
    .aero-plus-card:hover .aero-plus-icon { transform: rotate(90deg) scale(1.1); }
  `;
  document.head.appendChild(shelfStyles);

  return {
    folderIcon,
    wrapper: vistaWindow,
    isExpanded: () => isShelfExpanded,
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
