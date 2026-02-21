import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { createConnections } from "./World/Components/Connections.js";
import { createOverlayUI } from "./World/Components/OverlayUI.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import gsap from "gsap";

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

  const timer = new Timer();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Mesh.threshold = 0.06;
  raycaster.params.Line.threshold = 0.01;
  const mouse = new THREE.Vector2();

  let horseUpdater = null;
  let horseDataRef = null;
  let hoveredGroup = null;
  let isPaused = false;
  let mouseDownPos = { x: 0, y: 0 };

  let currentUsername = localStorage.getItem("horse_herd_username") || null;

  const clickThreshold = 5;
  const FREEZE_DIST = 0.4;
  const FULL_SPEED_DIST = 2.0;
  const GLOBAL_LABEL_DIST = 1.6;
  const INDIVIDUAL_CULL_DIST = 0.8;

  const conn = createConnections(scene);
  const overlay = createOverlayUI(scene, db, () => currentUsername);
  const userUI = createUserUI(db, overlay);

  // if already logged in, show the UI and the name
  if (currentUsername) {
    overlay.showMainUI();
    overlay.setUsername(currentUsername);
  }

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (horseDataRef) {
      const targets = [];
      horseDataRef.activeSpheres.forEach((s) => {
        s.mesh.traverse((child) => {
          if (child.isMesh && child.type !== "Sprite") targets.push(child);
        });
      });
      if (conn.lineMaterial.opacity > 0)
        conn.lineGroup.children.forEach((l) => targets.push(l));
      const intersects = raycaster.intersectObjects(targets);
      const isOverLine = conn.handleLineInteraction(intersects, mouse);
      const sphereHit = intersects.find((hit) => hit.object.type === "Mesh");
      if (sphereHit) {
        const group = sphereHit.object.parent;
        if (hoveredGroup !== group && group.userData.glow) {
          if (hoveredGroup)
            gsap.to(hoveredGroup.userData.glow.material, {
              opacity: 0,
              duration: 0.3,
            });
          hoveredGroup = group;
          document.body.style.cursor = "pointer";
          gsap.to(hoveredGroup.userData.glow.material, {
            opacity: 0.6,
            duration: 0.3,
          });
        }
      } else {
        if (hoveredGroup) {
          gsap.to(hoveredGroup.userData.glow.material, {
            opacity: 0,
            duration: 0.3,
          });
          hoveredGroup = null;
        }
        if (!isOverLine) document.body.style.cursor = "default";
      }
    }
  });

  window.addEventListener("mousedown", (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", (event) => {
    if (
      event.target.closest("#ui-container") ||
      event.target.id === "theme-cycle-dot" ||
      event.target.id === "manifesto-icon" ||
      event.target.id === "inner-horse-dot"
    )
      return;
    const deltaX = Math.abs(event.clientX - mouseDownPos.x);
    const deltaY = Math.abs(event.clientY - mouseDownPos.y);
    if (deltaX > clickThreshold || deltaY > clickThreshold) return;

    raycaster.setFromCamera(mouse, camera);
    if (horseDataRef) {
      const targets = [];
      horseDataRef.activeSpheres.forEach((s) => {
        s.mesh.traverse((child) => {
          if (child.isMesh && child.type !== "Sprite") targets.push(child);
        });
      });
      if (conn.lineMaterial.opacity > 0)
        conn.lineGroup.children.forEach((l) => targets.push(l));
      const intersects = raycaster.intersectObjects(targets);
      conn.handleLineInteraction(intersects, mouse);
      const sphereHit = intersects.find((hit) => hit.object.type === "Mesh");
      if (sphereHit) {
        isPaused = true;
        gsap.to(conn.lineMaterial, { opacity: 0.4, duration: 1 });
        const targetObj = sphereHit.object;
        const targetPos = new THREE.Vector3();
        targetObj.getWorldPosition(targetPos);
        const zoomFactor = targetObj.parent.scale.x * 12;
        const tl = gsap.timeline();
        tl.to(
          controls.target,
          {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 1.2,
            ease: "power3.inOut",
          },
          0,
        );
        const camDir = new THREE.Vector3()
          .subVectors(camera.position, targetPos)
          .normalize();
        const finalCamPos = targetPos
          .clone()
          .add(camDir.multiplyScalar(zoomFactor));
        tl.to(
          camera.position,
          {
            x: finalCamPos.x,
            y: finalCamPos.y,
            z: finalCamPos.z,
            duration: 1.2,
            ease: "power3.inOut",
            onUpdate: () => {
              camera.lookAt(targetPos);
            },
          },
          0,
        );
      } else if (!intersects.find((hit) => hit.object.type === "Line")) {
        isPaused = false;
        gsap.to(conn.lineMaterial, { opacity: 0, duration: 0.5 });
        conn.lineLabelDiv.style.opacity = "0";
        if (conn.hideInnerHorses) conn.hideInnerHorses(horseDataRef);
        const tl = gsap.timeline();
        tl.to(
          controls.target,
          { x: 0, y: 0, z: 0, duration: 1.2, ease: "power3.inOut" },
          0,
        );
        tl.to(
          camera.position,
          { x: 0, y: 0, z: 2.5, duration: 1.2, ease: "power3.inOut" },
          0,
        );
      }
    }
  });

  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;

    onSnapshot(collection(db, "users"), (snap) => {
      snap.docChanges().forEach((c) => {
        const data = c.doc.data();
        if (c.type === "added") {
          // pass data.innerColor - if it exists in firebase, horse will use it
          horseData.addUserSphere(data.username, data.innerColor);

          // if this is the logged-in user, update their UI dots/prompts
          if (data.username === currentUsername) {
            if (data.innerColor) {
              overlay.setInitialColor(data.innerColor);
              // ensure the prompt "choose your inner horse" disappears
              // if they already have a color saved
              const prompt = document.getElementById("color-prompt");
              if (prompt && data.innerColor !== "#ffffff") {
                prompt.style.display = "none";
              }
            }
          }
        }
        if (c.type === "modified") {
          if (data.username && data.innerColor) {
            horseData.updateUserColor(data.username, data.innerColor);
          }
        }
      });
    });
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
        if (!s.label) return;
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
    if (isPaused) {
      timeScale = 0;
      if (camDistFromOrigin >= FULL_SPEED_DIST) {
        isPaused = false;
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
