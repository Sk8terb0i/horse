import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { createConnections } from "./World/Components/Connections.js";
import { createOverlayUI } from "./World/Components/OverlayUI.js";
import { createSphereInteractions } from "./World/Components/SphereInteractions.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import gsap from "gsap";
import { createAudioManager } from "./World/Components/AudioManager.js";

// Glue Factory Imports
import {
  initGlueFactory,
  unmountGlueFactory,
} from "./World/Components/GlueFactory/GlueFactory.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYbyrD9uPCWh7e1GUUjc1Hd0gK6GEeDMI",
  authDomain: "horse-connection.firebaseapp.com",
  projectId: "horse-connection",
  storageBucket: "horse-connection.firebasestorage.app",
  messagingSenderId: "834343341431",
  appId: "1:834343341431:web:ecc15539578a25dda06572",
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GLUE SHELF COMPONENT ---
function initGlueShelf(currentUsername, showMemory, onToggle) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // Persistent positions
  const savedFolderPos = JSON.parse(
    localStorage.getItem("glue_folder_pos"),
  ) || { top: 200, left: 100 };
  const savedWindowPos = JSON.parse(
    localStorage.getItem("glue_window_pos"),
  ) || { top: 200, left: 200 };
  let isShelfExpanded = localStorage.getItem("shelf_expanded") === "true";

  // 1. THE FOLDER ICON (Standalone)
  const folderIcon = document.createElement("div");
  folderIcon.id = "glue-folder-standalone";
  folderIcon.style.cssText = `
    position: fixed; 
    top: ${savedFolderPos.top}px; 
    left: ${savedFolderPos.left}px; 
    z-index: 5000; 
    cursor: pointer; 
    display: ${currentUsername ? "block" : "none"}; 
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  folderIcon.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <img src="${ASSET_PATH}folder.png" style="width: 70px; height: auto; filter: sepia(1) saturate(10) hue-rotate(245deg) brightness(0.9) drop-shadow(2px 4px 6px rgba(0,0,0,0.3));">
      <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: 0px;">Glue</span>
    </div>
  `;

  // Folder Hover Animation
  folderIcon.onmouseenter = () => (folderIcon.style.transform = "scale(1.15)");
  folderIcon.onmouseleave = () => (folderIcon.style.transform = "scale(1)");

  // 2. THE VISTA WINDOW (Standalone)
  const vistaWindow = document.createElement("div");
  vistaWindow.className = "vista-window shelf-window";
  vistaWindow.style.cssText = `
    display: flex; 
    visibility: ${isShelfExpanded ? "visible" : "hidden"}; 
    opacity: ${isShelfExpanded ? 1 : 0};
    transform: ${isShelfExpanded ? "scale(1)" : "scale(0.9) translateY(10px)"};
    position: fixed; 
    top: ${savedWindowPos.top}px; 
    left: ${savedWindowPos.left}px; 
    width: 320px; 
    height: 400px; 
    z-index: 5001; 
    flex-direction: column;
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

  // --- WINDOW ANIMATION LOGIC ---
  const animateWindow = (show) => {
    gsap.to(vistaWindow, {
      duration: 0.4,
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.9,
      y: show ? 0 : 10,
      visibility: show ? "visible" : "hidden",
      ease: "back.out(1.7)",
      onStart: () => {
        if (show) vistaWindow.style.pointerEvents = "auto";
      },
      onComplete: () => {
        if (!show) vistaWindow.style.pointerEvents = "none";
      },
    });
  };

  // Screen Safety Check
  const checkBounds = () => {
    const rect = vistaWindow.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      vistaWindow.style.left = window.innerWidth - rect.width - 20 + "px";
    }
  };

  // --- DRAG UTILITY ---
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
  makeDraggable(
    vistaWindow,
    vistaWindow.querySelector("#shelf-drag-handle"),
    "glue_window_pos",
  );

  // Interaction Logic
  folderIcon.addEventListener("click", () => {
    if (folderStatus()) return;
    isShelfExpanded = !isShelfExpanded;
    localStorage.setItem("shelf_expanded", isShelfExpanded);
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
    .aero-plus-card:hover { 
      background: rgba(255, 255, 255, 0.4) !important;
      transform: translateY(-5px) scale(1.02) !important;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      border-color: rgba(255, 255, 255, 0.8) !important;
    }
    .aero-plus-card:active { transform: translateY(0) scale(0.98) !important; }
    .aero-plus-icon { 
      width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #a8ff78 0%, #08fbff 100%); 
      border:3px solid white; color:white; font-size:32px; display:flex; align-items:center; justify-content:center; 
      font-weight:bold; transition: transform 0.2s ease;
    }
    .aero-plus-card:hover .aero-plus-icon { transform: rotate(90deg) scale(1.1); }
    #shelf-items-container::-webkit-scrollbar { width: 12px; }
    #shelf-items-container::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); }
    #shelf-items-container::-webkit-scrollbar-thumb { 
      background: linear-gradient(to right, #f0f0f0, #cccccc); 
      border-radius: 10px; border: 3px solid transparent; background-clip: content-box;
    }
    #shelf-close-btn:hover { filter: brightness(1.2); }
  `;
  document.head.appendChild(shelfStyles);

  return {
    folderIcon,
    vistaWindow,
    isExpanded: () => isShelfExpanded,
    update: (usersData) => {
      const container = document.getElementById("shelf-items-container");
      if (!container) return;
      container.innerHTML = "";

      const plusCard = document.createElement("div");
      plusCard.className = "aero-plus-card";
      plusCard.innerHTML = `<div class="aero-plus-icon">+</div><span style="font-size:10px; color:#003366; font-weight:bold; text-transform:uppercase; font-family: sans-serif; margin-top:8px; text-shadow: 0 0 5px white;">NEW GLUE</span>`;
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
                <span style="font-size:10px; color:#000; margin-top:8px; font-family:serif; background: rgba(255,255,255,0.6); padding: 2px 4px; border-radius: 4px;">${data.name || "glue"}</span>
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

async function init() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.01,
    1000,
  );
  camera.position.set(0, 0, 2.5);

  let currentUsername = localStorage.getItem("horse_herd_username") || null;
  let horseDataRef = null;
  let globalGlueCreated = false;

  const conn = createConnections(scene);
  conn.lineMaterial.transparent = true;
  conn.lineMaterial.opacity = 0;
  const overlay = createOverlayUI(scene, db, () => currentUsername);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  const lDom = labelRenderer.domElement;
  lDom.style.position = "absolute";
  lDom.style.top = "0px";
  lDom.style.pointerEvents = "none";
  lDom.style.zIndex = "10";
  document.body.appendChild(lDom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.01;
  controls.maxDistance = 10;

  const interactions = createSphereInteractions(
    camera,
    controls,
    conn,
    () => horseDataRef,
  );

  const ritualRoot = document.createElement("div");
  ritualRoot.id = "glue-factory-root";
  document.body.appendChild(ritualRoot);

  const memoryModal = document.createElement("div");
  memoryModal.id = "memory-modal";
  memoryModal.style.cssText =
    "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:10000; display:none; justify-content:center; align-items:center;";
  document.body.appendChild(memoryModal);

  // --- LINE VISIBILITY LOGIC ---
  const applyShelfState = (expanded, animate = false) => {
    if (!currentUsername) return;
    const targetOpacity = expanded ? 0.5 : 0;
    const targetLabelOpacity = expanded ? "1" : "0";

    gsap.killTweensOf(conn.lineMaterial);
    conn.lineMaterial.transparent = true;

    if (animate) {
      gsap.to(conn.lineMaterial, {
        opacity: targetOpacity,
        duration: 0.5,
        onUpdate: () => {
          conn.lineMaterial.needsUpdate = true;
        },
      });
    } else {
      conn.lineMaterial.opacity = targetOpacity;
      conn.lineMaterial.needsUpdate = true;
    }

    if (conn.lineLabelDiv) {
      conn.lineLabelDiv.style.opacity = targetLabelOpacity;
      conn.lineLabelDiv.style.pointerEvents = expanded ? "auto" : "none";
    }
  };

  const glueShelf = initGlueShelf(currentUsername, showMemory, (expanded) => {
    applyShelfState(expanded, true);
  });

  [ritualRoot, memoryModal].forEach((uiElement) => {
    uiElement.addEventListener("pointerdown", (e) => e.stopPropagation());
    uiElement.addEventListener("click", (e) => e.stopPropagation());
  });

  function showMemory(name, config) {
    const ASSET_PATH = import.meta.env.BASE_URL + "GlueFactoryAssets/";
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

    // OPEN ANIMATION
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
  }

  if (currentUsername) {
    overlay.showMainUI();
    overlay.setUsername(currentUsername);
    createAudioManager();
  }

  const timer = new Timer();
  let horseUpdater = null;
  const FREEZE_DIST = 0.4;
  const FULL_SPEED_DIST = 2.0;
  const GLOBAL_LABEL_DIST = 1.6;
  const INDIVIDUAL_CULL_DIST = 0.8;

  const xpStyle = document.createElement("style");
  xpStyle.innerHTML = `
    #xp-loader-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: black; z-index: 999999;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .xp-logo { color: #fff; font-family: 'Tahoma', sans-serif; font-size: 36px; font-weight: bold; font-style: italic; margin-bottom: 50px; text-shadow: 2px 2px 4px rgba(255,255,255,0.3); }
    .xp-bar-wrapper { width: 160px; height: 18px; border: 2px solid #b2b2b2; border-radius: 5px; background: #000; position: relative; overflow: hidden; }
    .xp-bar-squares { position: absolute; top: 2px; height: 10px; width: 35px; display: flex; gap: 2px; animation: xp-slide 1.5s infinite linear; }
    .xp-square { flex: 1; background: linear-gradient(to bottom, #2838c7 0%, #5979f2 50%, #2838c7 100%); border-radius: 1px; }
    @keyframes xp-slide { 0% { left: -40px; } 100% { left: 170px; } }
  `;
  document.head.appendChild(xpStyle);

  const xpLoader = document.createElement("div");
  xpLoader.id = "xp-loader-overlay";
  xpLoader.innerHTML = `<div class="xp-logo">galloping...</div><div class="xp-bar-wrapper"><div class="xp-bar-squares"><div class="xp-square"></div><div class="xp-square"></div><div class="xp-square"></div></div></div>`;
  document.body.appendChild(xpLoader);

  let isInitialLoad = true;
  function handleNavigation() {
    const hash = window.location.hash;
    const isRitual = hash === "#/ritual";

    const executeSwap = () => {
      if (isRitual) {
        renderer.domElement.style.display = "none";
        lDom.style.display = "none";
        glueShelf.folderIcon.style.display = "none";
        glueShelf.vistaWindow.style.display = "none";
        applyShelfState(false, false);
        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "none";
        ritualRoot.style.display = "block";
        initGlueFactory(ritualRoot, db, currentUsername);
      } else {
        renderer.domElement.style.display = "block";
        lDom.style.display = "block";
        if (currentUsername) {
          glueShelf.folderIcon.style.display = "block";
          const expanded = glueShelf.isExpanded();
          glueShelf.vistaWindow.style.visibility = expanded
            ? "visible"
            : "hidden";
          glueShelf.vistaWindow.style.opacity = expanded ? 1 : 0;
          applyShelfState(expanded, false);
          const ui = document.getElementById("logged-in-ui");
          if (ui) ui.style.display = "block";
        }
        ritualRoot.style.display = "none";
        unmountGlueFactory();
      }
    };

    if (isInitialLoad) {
      executeSwap();
      isInitialLoad = false;
      return;
    }
    xpLoader.style.display = "flex";
    xpLoader.style.opacity = "1";
    executeSwap();
    setTimeout(() => {
      gsap.to(xpLoader, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => (xpLoader.style.display = "none"),
      });
    }, 1500);
  }

  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;
    createUserUI(db, overlay, horseData);
  } catch (err) {
    console.warn("3D Horse Failed to Load:", err);
  }

  let initialSync = true;
  const addedUsers = new Set();
  onSnapshot(collection(db, "users"), (snap) => {
    const allDocs = snap.docs.map((doc) => doc.data());
    glueShelf.update(allDocs);
    applyShelfState(glueShelf.isExpanded(), false);
    if (!initialSync) {
      snap.docChanges().forEach((c) => {
        const data = c.doc.data();
        if (c.type === "added") addUserToScene(data, true);
        if (c.type === "modified" && horseDataRef)
          horseDataRef.updateUserColor(
            data.username,
            data.innerColor,
            !!data.password,
          );
      });
      return;
    }
    initialSync = false;
    allDocs.forEach((userData) => addUserToScene(userData, true));
  });

  function addUserToScene(data, isVisible) {
    if (addedUsers.has(data.username)) return;
    addedUsers.add(data.username);
    if (horseDataRef)
      horseDataRef.addUserSphere(
        data.username,
        data.innerColor,
        !!data.password,
      );
    if (data.username === currentUsername && data.innerColor)
      overlay.setInitialColor(data.innerColor);
  }

  function animate(ts) {
    requestAnimationFrame(animate);
    if (window.location.hash === "#/ritual") return;
    timer.update(ts);
    controls.update();
    const camPos = camera.position;
    const camDistFromOrigin = camPos.length();
    if (horseDataRef) {
      if (conn.lineMaterial.opacity > 0) conn.updateConnections(horseDataRef);
      const globalActive = camDistFromOrigin < 1.6;
      horseDataRef.activeSpheres.forEach((s) => {
        if (!s.label || !s.mesh.visible) return;
        const sphereWorldPos = new THREE.Vector3();
        s.mesh.getWorldPosition(sphereWorldPos);
        const distToSphere = camPos.distanceTo(sphereWorldPos);
        s.label.element.style.opacity =
          globalActive && distToSphere < 0.8 ? "1" : "0";
      });
    }
    let timeScale = THREE.MathUtils.clamp(
      (camDistFromOrigin - 0.4) / (2.0 - 0.4),
      0,
      1,
    );
    if (interactions.getIsPaused()) {
      timeScale = 0;
      if (camDistFromOrigin >= 2.0) interactions.setIsPaused(false);
    }
    if (horseUpdater) horseUpdater(timer.getDelta() * timeScale, camera);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
