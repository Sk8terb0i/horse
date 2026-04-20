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

  // Track if at least one glue bottle exists globally to gate the connection lines
  let globalGlueCreated = false;

  // Setup 3D Components
  const conn = createConnections(scene);
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

  // --- GLUE FACTORY & SHELF DOM SETUP ---
  const ritualRoot = document.createElement("div");
  ritualRoot.id = "glue-factory-root";
  document.body.appendChild(ritualRoot);

  // Persistence: Check if shelf was previously expanded
  let isShelfExpanded = localStorage.getItem("shelf_expanded") === "true";

  // MOBILE RESPONSIVENESS: Shrink shelf elements to prevent UI icon overlap
  const mobileStyle = document.createElement("style");
  mobileStyle.innerHTML = `
    @media (max-width: 600px) {
      #sanctuary-shelf-wrapper { top: 10px !important; width: 95% !important; }
      #sanctuary-shelf { height: 80px !important; gap: 10px !important; padding: 5px !important; }
      #sanctuary-shelf div { width: 50px !important; }
      #sanctuary-shelf img { max-height: 40px !important; }
      #sanctuary-shelf span { font-size: 8px !important; }
      #sanctuary-shelf-header { font-size: 10px !important; padding: 2px 10px !important; }
    }
  `;
  document.head.appendChild(mobileStyle);

  const shelfWrapper = document.createElement("div");
  shelfWrapper.id = "sanctuary-shelf-wrapper";
  // Only display if logged in
  shelfWrapper.style.cssText = `
    position:fixed; top:20px; left:50%; transform:translateX(-50%); 
    z-index:50; display: ${currentUsername ? "flex" : "none"}; 
    flex-direction:column; align-items:center; width:90%; max-width:800px;
  `;

  const shelfHeader = document.createElement("div");
  shelfHeader.id = "sanctuary-shelf-header";
  shelfHeader.innerText = "Reclaiming glue by seizing the factories";
  shelfHeader.style.cssText =
    "background:#c0c0c0; border:2px outset #fff; padding:4px 15px; cursor:pointer; font-family:'MS Sans Serif', Arial; font-weight:bold; font-size:12px; margin-bottom:-2px; z-index:51; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); user-select:none;";

  // Interaction Animations for Header
  shelfHeader.onmouseenter = () =>
    (shelfHeader.style.backgroundColor = "#e0e0e0");
  shelfHeader.onmouseleave = () => {
    shelfHeader.style.backgroundColor = "#c0c0c0";
    shelfHeader.style.border = "2px outset #fff";
  };
  shelfHeader.onmousedown = () => {
    shelfHeader.style.border = "2px inset #fff";
    shelfHeader.style.padding = "5px 14px 3px 16px";
  };
  shelfHeader.onmouseup = () => {
    shelfHeader.style.border = "2px outset #fff";
    shelfHeader.style.padding = "4px 15px";
  };

  const shelfContainer = document.createElement("div");
  shelfContainer.id = "sanctuary-shelf";
  shelfContainer.style.cssText =
    "width:100%; height:110px; background:#c0c0c0; border:2px outset #fff; display:flex; align-items:center; gap:20px; padding:10px 15px; overflow-x:auto; overflow-y:hidden; box-shadow: 4px 4px 15px rgba(0,0,0,0.5); box-sizing:border-box;";

  const applyShelfState = (expanded, animate = false) => {
    if (!currentUsername) {
      shelfWrapper.style.display = "none";
      return;
    }
    shelfWrapper.style.display = "flex";
    shelfContainer.style.display = expanded ? "flex" : "none";

    // Only allow line opacity if shelf is expanded AND at least one glue exists globally
    const targetOpacity = expanded && globalGlueCreated ? 0.5 : 0;
    const targetLabelOpacity = expanded && globalGlueCreated ? "1" : "0";

    if (animate) {
      gsap.to(conn.lineMaterial, { opacity: targetOpacity, duration: 0.5 });
    } else {
      conn.lineMaterial.opacity = targetOpacity;
    }
    conn.lineLabelDiv.style.opacity = targetLabelOpacity;
  };

  shelfHeader.onclick = () => {
    isShelfExpanded = !isShelfExpanded;
    localStorage.setItem("shelf_expanded", isShelfExpanded);
    applyShelfState(isShelfExpanded, true);
  };

  applyShelfState(isShelfExpanded, false);

  shelfWrapper.appendChild(shelfHeader);
  shelfWrapper.appendChild(shelfContainer);
  document.body.appendChild(shelfWrapper);

  const memoryModal = document.createElement("div");
  memoryModal.id = "memory-modal";
  memoryModal.style.cssText =
    "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:1000; display:none; justify-content:center; align-items:center;";
  document.body.appendChild(memoryModal);

  function updateShelfUI(usersData) {
    shelfContainer.innerHTML = "";
    let hasBottles = false;
    const allBottles = [];

    // 1. Gather all bottled glue from all users
    usersData.forEach((user) => {
      if (user.manifestations) {
        Object.entries(user.manifestations).forEach(([horseID, data]) => {
          if (data.isBottled && data.finalImage) {
            allBottles.push({ horseID, data });
          }
        });
      }
    });

    // 2. Sort by ID (timestamp) so newest is at the end (appearing on the right)
    allBottles.sort((a, b) => {
      const timeA = parseInt(a.horseID.replace("horse_", "")) || 0;
      const timeB = parseInt(b.horseID.replace("horse_", "")) || 0;
      return timeA - timeB;
    });

    // 3. Render Sorted Bottles
    allBottles.forEach(({ horseID, data }) => {
      hasBottles = true;
      const bottleDiv = document.createElement("div");
      bottleDiv.style.cssText =
        "display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; width:80px; flex-shrink:0; transition: transform 0.2s;";
      bottleDiv.onmouseenter = () =>
        (bottleDiv.style.transform = "translateY(-4px)");
      bottleDiv.onmouseleave = () =>
        (bottleDiv.style.transform = "translateY(0)");

      const displayName = data.name || horseID;

      bottleDiv.innerHTML = `
        <div style="width: 80px; height: 60px; display: flex; justify-content: center; align-items: center; margin-bottom: 5px;">
           <img src="${data.finalImage}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.4));">
        </div>
        <div style="width: 100%; display: flex; justify-content: center;">
           <span style="font-family:'MS Sans Serif', Arial, sans-serif; font-weight:bold; font-size:10px; color:#000; background:#fff; padding:2px 4px; border:2px inset #fff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; box-sizing:border-box;">${displayName.toUpperCase()}</span>
        </div>
      `;
      bottleDiv.onclick = () => showMemory(displayName, data.config);
      shelfContainer.appendChild(bottleDiv);
    });

    if (!hasBottles) {
      const emptyMsg = document.createElement("span");
      emptyMsg.innerHTML =
        "Nothing holds us together. <br> <span style='color:#0000ee; text-decoration:underline; font-size:10px;'>[ Start the Reclamation ]</span>";
      emptyMsg.style.cssText =
        "font-family:'MS Sans Serif', Arial; font-size:12px; color:#000; margin: auto; cursor:pointer; text-align:center;";
      emptyMsg.onclick = () => (window.location.hash = "#/ritual");
      shelfContainer.appendChild(emptyMsg);
    } else {
      const createBtn = document.createElement("button");
      createBtn.innerText = "+";
      createBtn.className = "btn-95";
      createBtn.style.cssText =
        "margin-left: auto; font-size: 18px; font-weight: bold; width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 0; cursor: pointer;";
      createBtn.onclick = () => (window.location.hash = "#/ritual");
      shelfContainer.appendChild(createBtn);
    }
  }

  function showMemory(name, config) {
    const formatCoord = (val) => {
      const s = String(val);
      return s.includes("%") || s.includes("px") ? s : s + "%";
    };

    const partsHtml = config
      .map((p) => {
        const isBack = p.category && p.category.includes("_back");
        const safeScale = p.scale !== undefined ? p.scale : 0.7;
        const safeRotate = p.rotate !== undefined ? p.rotate : 0;
        const safeZ = p.zIndex !== undefined ? p.zIndex : 10;

        // FIXED: Pointing to the public folder
        return `<img src="/GlueFactoryAssets/${p.file}" 
                   style="position:absolute; 
                          left:${formatCoord(p.x)}; 
                          top:${formatCoord(p.y)}; 
                          transform:translate(-50%, -50%) scale(${safeScale}) rotate(${safeRotate}deg); 
                          z-index:${safeZ}; 
                          pointer-events:none;
                          display: block;
                          ${isBack ? "filter: brightness(0.7);" : ""}">`;
      })
      .join("");

    memoryModal.innerHTML = `
      <div style="background:#c0c0c0; border:2px outset #fff; padding:3px; display:flex; flex-direction:column; box-shadow: 5px 5px 25px rgba(0,0,0,0.9); width: 90vw; max-width: 1000px;">
         <div style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-family:'MS Sans Serif', Arial; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
           <span>Memory of ${name}</span>
           <button id="close-memory" style="font-weight:bold; cursor:pointer; background:#c0c0c0; border:2px outset #fff; padding: 0 4px; color: #000;">X</button>
         </div>
         <div style="width: 100%; aspect-ratio: 1800 / 1126; position: relative; background-image: url('/GlueFactoryAssets/bg_dressup_room.jpg'); background-size: cover; background-position: center; border:2px inset #fff; margin-top:3px; overflow: hidden; background-repeat: no-repeat;">
            ${partsHtml}
         </div>
      </div>
    `;

    memoryModal.style.display = "flex";
    document.getElementById("close-memory").onclick = () => {
      memoryModal.style.display = "none";
      memoryModal.innerHTML = "";
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

  function handleNavigation() {
    const hash = window.location.hash;
    const isRitual = hash === "#/ritual";

    if (isRitual) {
      renderer.domElement.style.display = "none";
      lDom.style.display = "none";
      shelfWrapper.style.display = "none";
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "none";

      ritualRoot.style.display = "block";
      initGlueFactory(ritualRoot, db, currentUsername);
    } else {
      renderer.domElement.style.display = "block";
      lDom.style.display = "block";
      // Only show shelf if logged in
      shelfWrapper.style.display = currentUsername ? "flex" : "none";
      if (currentUsername) {
        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "block";
      }

      ritualRoot.style.display = "none";
      unmountGlueFactory();
    }
  }

  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  let userUI = null;

  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;
    userUI = createUserUI(db, overlay, horseData);
  } catch (err) {
    console.warn("3D Horse Failed to Load:", err);
  }

  let initialSync = true;
  const addedUsers = new Set();
  const initialPause = 1500;
  const staggerDelay = 300;

  onSnapshot(collection(db, "users"), (snap) => {
    const allDocs = snap.docs.map((doc) => doc.data());

    // NEW: Check if ANY glue bottle exists globally to toggle connection line visibility
    globalGlueCreated = allDocs.some(
      (u) =>
        u.manifestations &&
        Object.values(u.manifestations).some((m) => m.isBottled),
    );

    updateShelfUI(allDocs);

    // Refresh state to handle line visibility now that we know if glue exists
    applyShelfState(isShelfExpanded, false);

    if (!initialSync) {
      snap.docChanges().forEach((c) => {
        const data = c.doc.data();
        const isVisible = userUI ? userUI.isHerdVisible() : true;
        if (c.type === "added" && !addedUsers.has(data.username))
          addUserToScene(data, isVisible);
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
    const me = allDocs.find((u) => u.username === currentUsername);
    if (me) addUserToScene(me, true);
    const others = allDocs.filter(
      (u) => u.username !== currentUsername && u.username !== "big horse",
    );

    setTimeout(() => {
      others.forEach((userData, index) => {
        const isVisible = userUI ? userUI.isHerdVisible() : true;
        setTimeout(
          () => addUserToScene(userData, isVisible),
          index * staggerDelay,
        );
      });
    }, initialPause);
  });

  function addUserToScene(data, isVisible) {
    if (addedUsers.has(data.username)) return;
    addedUsers.add(data.username);
    if (horseDataRef) {
      horseDataRef.addUserSphere(
        data.username,
        data.innerColor,
        !!data.password,
      );
      const sphere = horseDataRef.activeSpheres.find(
        (s) => s.username === data.username,
      );
      if (sphere && data.username !== "big horse")
        sphere.mesh.visible = isVisible;
    }
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

      const globalActive = camDistFromOrigin < GLOBAL_LABEL_DIST;
      horseDataRef.activeSpheres.forEach((s) => {
        if (!s.label || !s.mesh.visible) return;
        const sphereWorldPos = new THREE.Vector3();
        s.mesh.getWorldPosition(sphereWorldPos);
        const distToSphere = camPos.distanceTo(sphereWorldPos);
        s.label.element.style.opacity =
          globalActive && distToSphere < INDIVIDUAL_CULL_DIST ? "1" : "0";
      });
    }

    let timeScale = THREE.MathUtils.clamp(
      (camDistFromOrigin - FREEZE_DIST) / (FULL_SPEED_DIST - FREEZE_DIST),
      0,
      1,
    );

    if (interactions.getIsPaused()) {
      timeScale = 0;
      if (camDistFromOrigin >= FULL_SPEED_DIST) {
        interactions.setIsPaused(false);
        if (conn.hideInnerHorses) conn.hideInnerHorses(horseDataRef);
      }
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
