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

  // The Display Shelf
  const shelfContainer = document.createElement("div");
  shelfContainer.id = "sanctuary-shelf";
  shelfContainer.style.cssText =
    "position:fixed; bottom:0; left:0; width:100%; height:160px; background:#c0c0c0; border-top:2px outset #fff; display:flex; gap:20px; padding:15px; overflow-x:auto; overflow-y:hidden; z-index:50; box-shadow: 0 -4px 10px rgba(0,0,0,0.5);";
  document.body.appendChild(shelfContainer);

  // The Reconstructed Horse Modal
  const memoryModal = document.createElement("div");
  memoryModal.id = "memory-modal";
  memoryModal.style.cssText =
    "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:1000; display:none; justify-content:center; align-items:center;";
  document.body.appendChild(memoryModal);

  function updateShelfUI(usersData) {
    shelfContainer.innerHTML = "";
    usersData.forEach((user) => {
      if (user.manifestations) {
        Object.entries(user.manifestations).forEach(([horseName, data]) => {
          if (data.isBottled && data.finalImage) {
            const bottleDiv = document.createElement("div");
            bottleDiv.style.cssText =
              "display:flex; flex-direction:column; align-items:center; cursor:pointer; min-width:100px; transition: transform 0.2s;";
            bottleDiv.onmouseenter = () =>
              (bottleDiv.style.transform = "translateY(-5px)");
            bottleDiv.onmouseleave = () =>
              (bottleDiv.style.transform = "translateY(0)");

            bottleDiv.innerHTML = `
              <img src="${data.finalImage}" style="height:100px; object-fit:contain; filter: drop-shadow(3px 3px 2px rgba(0,0,0,0.5));">
              <span style="font-family:'MS Sans Serif', Arial, sans-serif; font-weight:bold; font-size:11px; color:#000; margin-top:8px; background:#fff; padding:2px 6px; border:2px inset #fff;">${horseName.toUpperCase()}</span>
            `;
            bottleDiv.onclick = () => showMemory(horseName, data.config);
            shelfContainer.appendChild(bottleDiv);
          }
        });
      }
    });
  }

  function showMemory(name, config) {
    // Reconstruct the horse dynamically from the saved config
    const partsHtml = config
      .map((p) => {
        return `<img src="./src/World/Components/GlueFactory/${p.file}" 
                   style="position:absolute; left:${p.x}; top:${p.y}; 
                          transform:translate(-50%, -50%) scale(${p.scale}) rotate(${p.rotate}deg); 
                          z-index:${p.zIndex}; pointer-events:none;">`;
      })
      .join("");

    memoryModal.innerHTML = `
      <div style="background:#c0c0c0; border:2px outset #fff; padding:3px; display:flex; flex-direction:column; box-shadow: 5px 5px 15px rgba(0,0,0,0.8);">
         <div style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-family:'MS Sans Serif', Arial; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
           <span>Memory of ${name}</span>
           <button id="close-memory" style="font-weight:bold; cursor:pointer; background:#c0c0c0; border:2px outset #fff; padding: 0 4px;">X</button>
         </div>
         <div style="width: 50vw; height: 50vh; min-width:300px; min-height:300px; position:relative; background:url('./src/World/Components/GlueFactory/bg_dressup_room.jpg') center/cover; overflow:hidden; border:2px inset #fff; margin-top:3px;">
            ${partsHtml}
         </div>
      </div>
    `;
    memoryModal.style.display = "flex";
    document.getElementById("close-memory").onclick = () =>
      (memoryModal.style.display = "none");
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
      // Hide 3D World & Shelf
      renderer.domElement.style.display = "none";
      lDom.style.display = "none";
      shelfContainer.style.display = "none";
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "none";

      // Show 2D World
      ritualRoot.style.display = "block";
      initGlueFactory(ritualRoot, db, currentUsername);
    } else {
      // Show 3D World & Shelf
      renderer.domElement.style.display = "block";
      lDom.style.display = "block";
      shelfContainer.style.display = "flex";
      if (currentUsername) {
        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "block";
      }

      // Hide 2D World
      ritualRoot.style.display = "none";
      unmountGlueFactory();
    }
  }

  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  // --- FIREBASE & HORSE LOADING ---
  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;

    const userUI = createUserUI(db, overlay, horseData);

    let initialSync = true;
    const addedUsers = new Set();
    const initialPause = 1500;
    const staggerDelay = 300;

    onSnapshot(collection(db, "users"), (snap) => {
      const allDocs = snap.docs.map((doc) => doc.data());

      // Update the Bottle Shelf with every database change
      updateShelfUI(allDocs);

      if (!initialSync) {
        snap.docChanges().forEach((c) => {
          const data = c.doc.data();
          if (c.type === "added" && !addedUsers.has(data.username))
            addUserToScene(data, userUI.isHerdVisible());
          if (c.type === "modified")
            horseData.updateUserColor(
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
          setTimeout(
            () => addUserToScene(userData, userUI.isHerdVisible()),
            index * staggerDelay,
          );
        });
      }, initialPause);
    });

    function addUserToScene(data, isVisible) {
      if (addedUsers.has(data.username)) return;
      horseData.addUserSphere(data.username, data.innerColor, !!data.password);
      addedUsers.add(data.username);
      const sphere = horseData.activeSpheres.find(
        (s) => s.username === data.username,
      );
      if (sphere && data.username !== "big horse")
        sphere.mesh.visible = isVisible;
      if (data.username === currentUsername && data.innerColor)
        overlay.setInitialColor(data.innerColor);
    }
  } catch (err) {
    console.error(err);
  }

  // --- ANIMATION LOOP ---
  function animate(ts) {
    requestAnimationFrame(animate);

    // Skip heavy 3D updates if we are in the ritual
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
