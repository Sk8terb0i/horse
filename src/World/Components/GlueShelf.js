// --- GLUE SHELF COMPONENT ---
function initGlueShelf(currentUsername, showMemory, onToggle) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // WHERE TO CHANGE FOLDER POSITION: Adjust the { top, left } values below
  const savedPos = JSON.parse(localStorage.getItem("glue_folder_pos")) || {
    top: 200,
    left: 100,
  };
  let isShelfExpanded = localStorage.getItem("shelf_expanded") === "true";

  const wrapper = document.createElement("div");
  wrapper.id = "glue-shelf-wrapper";
  wrapper.style.cssText = `
    position: fixed; 
    top: ${savedPos.top}px; 
    left: ${savedPos.left}px; 
    z-index: 5000;
    display: ${currentUsername ? "flex" : "none"};
    flex-direction: column;
    align-items: center;
    user-select: none;
  `;

  const folderIcon = document.createElement("div");
  folderIcon.innerHTML = `
    <div class="folder-container" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <img src="${ASSET_PATH}folder.png" style="width: 70px; height: auto; filter: sepia(1) saturate(10) hue-rotate(245deg) brightness(0.9) drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
      <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: -5px;">glue</span>
    </div>
  `;

  const vistaWindow = document.createElement("div");
  vistaWindow.className = "vista-window shelf-window";
  vistaWindow.style.cssText = `
    display: ${isShelfExpanded ? "flex" : "none"};
    position: absolute; top: 90px; left: 0;
    width: 320px; height: 400px; z-index: 5001;
    flex-direction: column;
  `;

  // ADDED: Close button (aero_close.png) in the title bar
  vistaWindow.innerHTML = `
    <div class="vista-title-bar">
      <div class="vista-title">Glue Shelf</div>
      <img src="${ASSET_PATH}aero_close.png" id="shelf-close-btn" style="height: 22px; cursor: pointer; transition: filter 0.2s;">
    </div>
    <div class="vista-content-area" id="shelf-items-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 20px; overflow-y: auto; overflow-x: hidden;">
    </div>
  `;

  wrapper.appendChild(folderIcon);
  wrapper.appendChild(vistaWindow);
  document.body.appendChild(wrapper);

  // --- LOGIC FOR CLOSE BUTTON ---
  vistaWindow.addEventListener("click", (e) => {
    if (e.target.id === "shelf-close-btn") {
      isShelfExpanded = false;
      localStorage.setItem("shelf_expanded", "false");
      vistaWindow.style.display = "none";
      if (onToggle) onToggle(false);
    }
  });

  // --- FIXED DRAG LOGIC ---
  let isDragging = false;
  let startPos = { x: 0, y: 0 };

  folderIcon.addEventListener("mousedown", (e) => {
    isDragging = false;
    startPos = { x: e.clientX, y: e.clientY };

    const onMouseMove = (moveEvent) => {
      if (
        Math.abs(moveEvent.clientX - startPos.x) > 5 ||
        Math.abs(moveEvent.clientY - startPos.y) > 5
      ) {
        isDragging = true;
        // Use left/top consistently for both dragging and saving
        wrapper.style.left = moveEvent.clientX - 35 + "px";
        wrapper.style.top = moveEvent.clientY - 35 + "px";
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (isDragging) {
        // Save current top/left to fix the refresh bug
        localStorage.setItem(
          "glue_folder_pos",
          JSON.stringify({
            top: parseInt(wrapper.style.top),
            left: parseInt(wrapper.style.left),
          }),
        );
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  folderIcon.addEventListener("click", () => {
    if (!isDragging) {
      isShelfExpanded = !isShelfExpanded;
      localStorage.setItem("shelf_expanded", isShelfExpanded);
      vistaWindow.style.display = isShelfExpanded ? "flex" : "none";
      if (onToggle) onToggle(isShelfExpanded);
    }
  });

  const shelfStyles = document.createElement("style");
  shelfStyles.innerHTML = `
    .folder-container:hover { transform: scale(1.1); }
    
    /* ADDED: Custom Background Image for the Content Area */
    .shelf-window .vista-content-area {
      background: url('${ASSET_PATH}glue_bg.jpg') center/cover no-repeat !important;
    }

    #shelf-close-btn:hover { filter: brightness(1.2) contrast(1.1); }

    .aero-plus-card {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 15px; cursor: pointer;
      border-radius: 8px; transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(5px);
    }
    .aero-plus-card:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-3px); }
    /* ... (rest of your styles) ... */
  `;
  document.head.appendChild(shelfStyles);

  return {
    wrapper,
    isExpanded: () => isShelfExpanded,
    update: (usersData) => {
      const container = document.getElementById("shelf-items-container");
      if (!container) return;
      container.innerHTML = "";

      const plusCard = document.createElement("div");
      plusCard.className = "aero-plus-card";
      plusCard.innerHTML = `<div class="aero-plus-icon">+</div><span style="font-size:10px; color:#003366; font-weight:bold; text-transform:uppercase; font-family: sans-serif; text-shadow: 0 0 5px white;">New Glue</span>`;
      plusCard.onclick = () => (window.location.hash = "#/ritual");
      container.appendChild(plusCard);

      usersData.forEach((user) => {
        if (user.manifestations) {
          Object.entries(user.manifestations).forEach(([id, data]) => {
            if (data.isBottled && data.finalImage) {
              const item = document.createElement("div");
              item.className = "aero-plus-card";
              item.innerHTML = `
                <img src="${data.finalImage}" style="width:50px; height:50px; object-fit:contain; filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
                <span style="font-size:10px; color:#000; margin-top:8px; font-family:serif; background: rgba(255,255,255,0.6); padding: 2px 4px; border-radius: 4px;">${(data.name || "glue").toLowerCase()}</span>
              `;
              item.onclick = () => showMemory(data.name || id, data.config);
              container.appendChild(item);
            }
          });
        }
      });
    },
  };
}
