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

const firebaseConfig = {
  apiKey: "AIzaSyAYbyrD9uPCWh7e1GUUjc1Hd0gK6GEeDMI",
  authDomain: "horse-connection.firebaseapp.com",
  projectId: "horse-connection",
  storageBucket: "horse-connection.firebasestorage.app",
  messagingSenderId: "834343341431",
  appId: "1:834343341431:web:ecc15539578a25dda06572",
};

// INITIALIZE FIREBASE FIRST
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

  // db is now defined and ready for these components
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

      const allDocs = snap.docs.map((doc) => doc.data());
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

  function animate(ts) {
    requestAnimationFrame(animate);
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
