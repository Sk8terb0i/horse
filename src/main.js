import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { createConnections } from "./World/Components/Connections.js";
import { createOverlayUI } from "./World/Components/OverlayUI.js";
import { createSphereInteractions } from "./World/Components/SphereInteractions.js";
import { createTaskbar } from "./World/Components/Taskbar.js";
import { createAudioLibrary } from "./World/Components/AudioLibrary.js";
import { initGlueShelf } from "./World/Components/GlueShelf.js";
import { createMemoryModal } from "./World/Components/MemoryModal.js";
import { createXPLoader } from "./World/Components/XPLoader.js";
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
  let globalGlueCreated = false;

  // FIXED: These must be declared at the very top before any async/await calls
  let horseUpdater = null;
  const timer = new Timer();

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

  // Setup Ritual Root
  const ritualRoot = document.createElement("div");
  ritualRoot.id = "glue-factory-root";
  document.body.appendChild(ritualRoot);
  ritualRoot.addEventListener("pointerdown", (e) => e.stopPropagation());
  ritualRoot.addEventListener("click", (e) => e.stopPropagation());

  // EXTERNAL UI COMPONENTS
  const memoryModal = createMemoryModal();
  const xpLoader = createXPLoader();

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

  const glueShelf = initGlueShelf(
    currentUsername,
    memoryModal.showMemory,
    (expanded) => {
      applyShelfState(expanded, true);
    },
  );

  const taskbar = createTaskbar(scene);
  if (!currentUsername) taskbar.style.display = "none";

  const audioLibrary = createAudioLibrary(currentUsername);

  if (currentUsername) {
    overlay.showMainUI();
    overlay.setUsername(currentUsername);
    createAudioManager();
  }

  // NAVIGATION SYNC
  let isInitialLoad = true;
  function handleNavigation() {
    const hash = window.location.hash;
    const isRitual = hash === "#/ritual";

    const executeSwap = () => {
      if (isRitual) {
        renderer.domElement.style.display = "none";
        lDom.style.display = "none";

        // Match the 'wrapper' object from your uploaded GlueShelf.js
        if (glueShelf.wrapper) glueShelf.wrapper.style.display = "none";
        taskbar.style.display = "none";
        audioLibrary.setDisplay(false);
        applyShelfState(false, false);

        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "none";
        ritualRoot.style.display = "block";
        initGlueFactory(ritualRoot, db, currentUsername);
      } else {
        renderer.domElement.style.display = "block";
        lDom.style.display = "block";

        if (currentUsername) {
          if (glueShelf.wrapper) glueShelf.wrapper.style.display = "flex";
          taskbar.style.display = "flex";
          audioLibrary.setDisplay(true);
          applyShelfState(glueShelf.isExpanded(), false);

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
    xpLoader.triggerLoad(executeSwap);
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
    globalGlueCreated = allDocs.some(
      (u) =>
        u.manifestations &&
        Object.values(u.manifestations).some((m) => m.isBottled),
    );
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
        s.label.element.style.opacity =
          globalActive && camPos.distanceTo(sphereWorldPos) < 0.8 ? "1" : "0";
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
