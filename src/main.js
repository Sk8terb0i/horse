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

  // The Collapsible Display Shelf Wrapper
  const shelfWrapper = document.createElement("div");
  shelfWrapper.id = "sanctuary-shelf-wrapper";
  shelfWrapper.style.cssText =
    "position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:50; display:flex; flex-direction:column; align-items:center; width:90%; max-width:800px;";

  const shelfHeader = document.createElement("div");
  shelfHeader.id = "sanctuary-shelf-header";
  shelfHeader.innerText = "[-] Reclaiming glue by seizing the factories";
  shelfHeader.style.cssText =
    "background:#c0c0c0; border:2px outset #fff; padding:4px 15px; cursor:pointer; font-family:'MS Sans Serif', Arial; font-weight:bold; font-size:12px; margin-bottom:-2px; z-index:51; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);";

  const shelfContainer = document.createElement("div");
  shelfContainer.id = "sanctuary-shelf";
  shelfContainer.style.cssText =
    "width:100%; height:110px; background:#c0c0c0; border:2px outset #fff; display:flex; align-items:center; gap:20px; padding:10px 15px; overflow-x:auto; overflow-y:hidden; box-shadow: 4px 4px 15px rgba(0,0,0,0.5); box-sizing:border-box;";

  shelfHeader.onclick = () => {
    const isOpen = shelfContainer.style.display !== "none";
    if (isOpen) {
      shelfContainer.style.display = "none";
      shelfHeader.innerText = "[+] The Sanctuary Shelf";
    } else {
      shelfContainer.style.display = "flex";
      shelfHeader.innerText = "[-] The Sanctuary Shelf";
    }
  };

  shelfWrapper.appendChild(shelfHeader);
  shelfWrapper.appendChild(shelfContainer);
  document.body.appendChild(shelfWrapper);

  // The Reconstructed Horse Modal Base
  const memoryModal = document.createElement("div");
  memoryModal.id = "memory-modal";
  memoryModal.style.cssText =
    "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:1000; display:none; justify-content:center; align-items:center;";
  document.body.appendChild(memoryModal);

  function updateShelfUI(usersData) {
    shelfContainer.innerHTML = "";
    let hasBottles = false;

    usersData.forEach((user) => {
      if (user.manifestations) {
        Object.entries(user.manifestations).forEach(([horseName, data]) => {
          if (data.isBottled && data.finalImage) {
            hasBottles = true;
            const bottleDiv = document.createElement("div");
            bottleDiv.style.cssText =
              "display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; width:80px; flex-shrink:0; transition: transform 0.2s;";
            bottleDiv.onmouseenter = () =>
              (bottleDiv.style.transform = "translateY(-4px)");
            bottleDiv.onmouseleave = () =>
              (bottleDiv.style.transform = "translateY(0)");

            bottleDiv.innerHTML = `
              <div style="width: 80px; height: 60px; display: flex; justify-content: center; align-items: center; margin-bottom: 5px;">
                 <img src="${data.finalImage}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.4));">
              </div>
              <div style="width: 100%; display: flex; justify-content: center;">
                 <span style="font-family:'MS Sans Serif', Arial, sans-serif; font-weight:bold; font-size:10px; color:#000; background:#fff; padding:2px 4px; border:2px inset #fff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; box-sizing:border-box;">${horseName.toUpperCase()}</span>
              </div>
            `;
            bottleDiv.onclick = () => showMemory(horseName, data.config);
            shelfContainer.appendChild(bottleDiv);
          }
        });
      }
    });

    if (!hasBottles) {
      shelfContainer.innerHTML = `<span style="font-family:'MS Sans Serif', Arial; font-size:12px; color:#808080; margin: auto;">Nothing holds us together.</span>`;
    }
  }

  // --- MEMORY MODAL RENDERER ---
  function showMemory(name, config) {
    const partsHtml = config
      .map((p) => {
        const isBack = p.category && p.category.includes("_back");

        // Safety fallbacks to prevent CSS from crashing if older database entries have missing scales
        const safeScale = p.scale !== undefined ? p.scale : 0.7;
        const safeRotate = p.rotate !== undefined ? p.rotate : 0;
        const safeZ = p.zIndex !== undefined ? p.zIndex : 10;

        return `<img src="./src/World/Components/GlueFactory/${p.file}" 
                   class="sprite-part"
                   style="position:absolute; left:${p.x}; top:${p.y}; 
                          transform:translate(-50%, -50%) scale(${safeScale}) rotate(${safeRotate}deg); 
                          z-index:${safeZ}; pointer-events:none;
                          ${isBack ? "filter: brightness(0.7);" : ""}">`;
      })
      .join("");

    memoryModal.innerHTML = `
      <div style="background:#c0c0c0; border:2px outset #fff; padding:3px; display:flex; flex-direction:column; box-shadow: 5px 5px 25px rgba(0,0,0,0.9); width: 90vw; max-width: 1000px;">
         <div style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-family:'MS Sans Serif', Arial; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
           <span>Memory of ${name}</span>
           <button id="close-memory" style="font-weight:bold; cursor:pointer; background:#c0c0c0; border:2px outset #fff; padding: 0 4px; color: #000;">X</button>
         </div>
         <div style="width: 100%; aspect-ratio: 1800 / 1126; position: relative; background-image: url('./src/World/Components/GlueFactory/bg_dressup_room.jpg'); background-size: cover; background-position: center; border:2px inset #fff; margin-top:3px; overflow: hidden;">
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

  // --- ROUTING LOGIC ---
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
      shelfWrapper.style.display = "flex";
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

  // --- FIREBASE & HORSE LOADING ---
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

    updateShelfUI(allDocs);

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

  // --- ANIMATION LOOP ---
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
        gsap.to(conn.lineMaterial, { opacity: 0, duration: 0.5 });
        conn.lineLabelDiv.style.opacity = "0";
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
