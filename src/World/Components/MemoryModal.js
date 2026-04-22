import gsap from "gsap";

export function createMemoryModal() {
  const ASSET_PATH = import.meta.env.BASE_URL + "GlueFactoryAssets/";

  const memoryModal = document.createElement("div");
  memoryModal.id = "memory-modal";
  memoryModal.style.cssText =
    "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:10000; display:none; justify-content:center; align-items:center;";
  document.body.appendChild(memoryModal);

  // Prevent interactions passing through to the 3D scene
  memoryModal.addEventListener("pointerdown", (e) => e.stopPropagation());
  memoryModal.addEventListener("click", (e) => e.stopPropagation());

  const showMemory = (name, config) => {
    const formatCoord = (val) =>
      String(val).includes("%") || String(val).includes("px") ? val : val + "%";

    const partsHtml = config
      .map((p) => {
        const isBack = p.category && p.category.includes("_back");
        return `<img src="${ASSET_PATH}${p.file}" 
                   style="position:absolute; left:${formatCoord(p.x)}; top:${formatCoord(p.y)}; 
                          transform:translate(-50%, -50%) scale(${p.scale || 0.7}) rotate(${p.rotate || 0}deg); 
                          z-index:${p.zIndex || 10}; pointer-events:none; ${isBack ? "filter: brightness(0.7);" : ""}">`;
      })
      .join("");

    memoryModal.innerHTML = `
      <div id="memory-drag-container" style="background:#c0c0c0; border:2px outset #fff; padding:3px; display:flex; flex-direction:column; box-shadow: 10px 10px 40px rgba(0,0,0,0.8); width: 70vw; height: 500px; min-width: 400px; position:absolute; z-index:10001; resize:both; overflow:hidden; opacity: 0; transform: scale(0.8);">
         <div id="memory-title-handle" style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-family:'MS Sans Serif', Arial; font-size: 12px; display: flex; justify-content: space-between; align-items: center; cursor:move; user-select:none;">
           <span>Memory of ${name}</span>
           <button id="close-memory" style="cursor:pointer; background:#c0c0c0; border:2px outset #fff; padding: 0 4px; transition: all 0.1s;">X</button>
         </div>
         <div style="flex-grow:1; width:100%; position:relative; background-image: url('${ASSET_PATH}bg_dressup_room.jpg'); background-size: cover; background-position: center; border:2px inset #fff; margin-top:3px; overflow:hidden;">
            ${partsHtml}
         </div>
      </div>
    `;

    memoryModal.style.display = "flex";
    const container = document.getElementById("memory-drag-container");

    gsap.to(memoryModal, { opacity: 1, duration: 0.3 });
    gsap.to(container, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: "back.out(1.2)",
    });

    const handle = document.getElementById("memory-title-handle");
    let mx = 0,
      my = 0;
    handle.onmousedown = (e) => {
      mx = e.clientX - container.offsetLeft;
      my = e.clientY - container.offsetTop;
      const move = (me) => {
        container.style.left = me.clientX - mx + "px";
        container.style.top = me.clientY - my + "px";
      };
      const stop = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    };

    document.getElementById("close-memory").onclick = () => {
      gsap.to(container, { opacity: 0, scale: 0.8, duration: 0.2 });
      gsap.to(memoryModal, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          memoryModal.style.display = "none";
          memoryModal.innerHTML = "";
        },
      });
    };
  };

  return { showMemory };
}
