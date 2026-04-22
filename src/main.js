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
import { createVoidManager } from "./World/Components/VoidManager.js";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import gsap from "gsap";
import { createAudioManager } from "./World/Components/AudioManager.js";

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

let globalVoidMessages = [];

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
  let globalUsersData = [];
  let isVoidMode = false;
  let horseUpdater = null;

  const timer = new Timer();
  const FREEZE_DIST = 0.4;
  const FULL_SPEED_DIST = 2.0;

  const conn = createConnections(scene);
  conn.lineMaterial.transparent = true;
  conn.lineMaterial.opacity = 0;

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
  const interactions = createSphereInteractions(
    camera,
    controls,
    conn,
    () => horseDataRef,
  );

  const ritualRoot = document.createElement("div");
  ritualRoot.id = "glue-factory-root";
  document.body.appendChild(ritualRoot);

  const memoryModal = createMemoryModal();
  const xpLoader = createXPLoader();
  const voidMgr = createVoidManager();

  const applyShelfState = (expanded, animate = false) => {
    if (!currentUsername || isVoidMode) return;
    const targetOpacity = expanded ? 0.5 : 0;
    gsap.to(conn.lineMaterial, {
      opacity: targetOpacity,
      duration: animate ? 0.5 : 0,
    });
    if (conn.lineLabelDiv) {
      conn.lineLabelDiv.style.opacity = expanded ? "1" : "0";
      conn.lineLabelDiv.style.pointerEvents = expanded ? "auto" : "none";
    }
  };

  const getManifestations = () => {
    let manifestations = [];
    globalUsersData.forEach((u) => {
      if (u.manifestations) {
        Object.values(u.manifestations).forEach((m) => {
          if (m.isBottled && m.finalImage && m.config) manifestations.push(m);
        });
      }
    });
    return manifestations;
  };

  window.VoidAPI_SubmitMessage = async (text) => {
    try {
      await addDoc(collection(db, "void_messages"), {
        text: text,
        user: currentUsername || "Anonymous",
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Ledger write failed", e);
    }
  };

  const glueShelf = initGlueShelf(
    currentUsername,
    memoryModal.showMemory,
    (exp) => applyShelfState(exp, true),
  );
  const audioLibrary = createAudioLibrary(currentUsername);
  const overlay = createOverlayUI(scene, db, () => currentUsername);

  const handleThemeChange = (themeId) => {
    if (themeId === "void") {
      isVoidMode = true;
      renderer.domElement.style.display = "none";
      lDom.style.display = "none";
      if (glueShelf.wrapper) glueShelf.wrapper.style.display = "none";
      if (glueShelf.folderIcon) glueShelf.folderIcon.style.display = "none";
      audioLibrary.setDisplay(false);
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "none";
      voidMgr.start(getManifestations());
    } else {
      isVoidMode = false;
      voidMgr.stop();
      if (window.location.hash !== "#/ritual") {
        renderer.domElement.style.display = "block";
        lDom.style.display = "block";
        if (currentUsername) {
          if (glueShelf.wrapper)
            glueShelf.wrapper.style.display = glueShelf.isExpanded()
              ? "flex"
              : "none";
          if (glueShelf.folderIcon)
            glueShelf.folderIcon.style.display = "block";
          audioLibrary.setDisplay(true);
          const ui = document.getElementById("logged-in-ui");
          if (ui) ui.style.display = "block";
        }
      }
    }
  };

  const taskbar = createTaskbar(scene, handleThemeChange);
  if (!currentUsername) taskbar.style.display = "none";

  function handleNavigation() {
    const hash = window.location.hash;
    const isRitual = hash === "#/ritual";
    const currentTheme = localStorage.getItem("horse_herd_theme") || "herd";

    const executeSwap = () => {
      if (isRitual) {
        voidMgr.stop();
        renderer.domElement.style.display = "none";
        lDom.style.display = "none";
        if (glueShelf.wrapper) glueShelf.wrapper.style.display = "none";
        taskbar.style.display = "none";
        audioLibrary.setDisplay(false);
        applyShelfState(false, false);
        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "none";
        ritualRoot.style.display = "block";
        initGlueFactory(ritualRoot, db, currentUsername);
      } else {
        ritualRoot.style.display = "none";
        unmountGlueFactory();
        if (currentTheme === "void") {
          isVoidMode = true;
          renderer.domElement.style.display = "none";
          lDom.style.display = "none";
          taskbar.style.display = "flex";

          // UPDATED: Pass globalVoidMessages here to ensure windows populate immediately
          voidMgr.start(getManifestations(), globalVoidMessages);
        } else {
          isVoidMode = false;
          renderer.domElement.style.display = "block";
          lDom.style.display = "block";
          if (currentUsername) {
            if (glueShelf.wrapper)
              glueShelf.wrapper.style.display = glueShelf.isExpanded()
                ? "flex"
                : "none";
            taskbar.style.display = "flex";
            audioLibrary.setDisplay(true);
            applyShelfState(glueShelf.isExpanded(), false);
            const ui = document.getElementById("logged-in-ui");
            if (ui) ui.style.display = "block";
          }
        }
      }
    };
    isInitialLoad
      ? (executeSwap(), (isInitialLoad = false))
      : xpLoader.triggerLoad(executeSwap);
  }

  let isInitialLoad = true;
  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  let initialSync = true;
  const addedUsers = new Set();

  onSnapshot(collection(db, "users"), (snap) => {
    globalUsersData = snap.docs.map((doc) => doc.data());
    glueShelf.update(globalUsersData);

    const currentTheme = localStorage.getItem("horse_herd_theme") || "herd";
    if (currentTheme === "void" && currentUsername) {
      const manifestations = getManifestations();
      if (manifestations.length > 0) voidMgr.start(manifestations);
    }

    if (!initialSync) {
      snap.docChanges().forEach((c) => {
        const data = c.doc.data();
        if (c.type === "added") addUserToScene(data);
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
    globalUsersData.forEach((userData) => addUserToScene(userData));
  });

  function addUserToScene(data) {
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

  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;
    createUserUI(db, overlay, horseData);
    if (currentUsername) {
      overlay.showMainUI();
      overlay.setUsername(currentUsername);
      createAudioManager();
    }
  } catch (err) {
    console.warn("3D Horse Failed to Load:", err);
  }

  function animate(ts) {
    requestAnimationFrame(animate);
    if (window.location.hash === "#/ritual" || isVoidMode) return;

    const delta = timer.getDelta();
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
      (camDistFromOrigin - FREEZE_DIST) / (FULL_SPEED_DIST - FREEZE_DIST),
      0,
      1,
    );
    if (interactions.getIsPaused()) {
      timeScale = 0;
      if (camDistFromOrigin >= FULL_SPEED_DIST) interactions.setIsPaused(false);
    }
    if (horseUpdater) horseUpdater(delta * timeScale, camera);

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

  onSnapshot(
    query(
      collection(db, "void_messages"),
      orderBy("timestamp", "desc"),
      limit(30),
    ),
    (snap) => {
      globalVoidMessages = snap.docs.map((doc) => doc.data());
      const theme = localStorage.getItem("horse_herd_theme");
      // Refresh the Void Manager whenever new messages arrive
      if (theme === "void" && currentUsername) {
        voidMgr.start(getManifestations(), globalVoidMessages);
      }
    },
  );
}

init();
