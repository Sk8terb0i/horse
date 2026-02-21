import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { ManifestoContent } from "./World/Components/Content.js";
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
  lDom.style.zIndex = "1";
  document.body.appendChild(lDom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 0.01;
  controls.maxDistance = 10;

  const timer = new Timer();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Mesh.threshold = 0.06;
  const mouse = new THREE.Vector2();

  let horseUpdater = null;
  let horseDataRef = null;
  let hoveredGroup = null;
  let isPaused = false;
  let mouseDownPos = { x: 0, y: 0 };
  const clickThreshold = 5;

  const FREEZE_DIST = 0.4;
  const FULL_SPEED_DIST = 2.0;
  const GLOBAL_LABEL_DIST = 1.6;
  const INDIVIDUAL_CULL_DIST = 0.8;

  const manifestOverlay = document.createElement("div");
  manifestOverlay.id = "loading-overlay";
  manifestOverlay.innerHTML = ManifestoContent;
  document.body.appendChild(manifestOverlay);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  document.body.appendChild(icon);

  const themeDot = document.createElement("div");
  themeDot.id = "theme-cycle-dot";
  document.body.appendChild(themeDot);

  const setTheme = (themeName) => {
    document.documentElement.setAttribute("data-theme", themeName);
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue("--bg-color").trim() || "#000000";
    const newBg = new THREE.Color(bgColor);
    gsap.to(scene.background, {
      r: newBg.r,
      g: newBg.g,
      b: newBg.b,
      duration: 1.2,
      ease: "power2.inOut",
    });
  };

  themeDot.onclick = () => {
    const themes = ["herd", "dolphin", "void"];
    const current =
      document.documentElement.getAttribute("data-theme") || "herd";
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    setTheme(next);
  };

  icon.onclick = () => {
    manifestOverlay.classList.add("active");
  };

  document.addEventListener("click", (e) => {
    if (
      e.target.id === "manifesto-overlay-bg" ||
      e.target.id === "close-manifesto"
    ) {
      manifestOverlay.classList.remove("active");
    }
  });

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (horseDataRef) {
      // we check for meshes inside the groups
      const meshes = [];
      horseDataRef.activeSpheres.forEach((s) => {
        // if s.mesh is a Group, traverse it
        if (s.mesh.isGroup) {
          s.mesh.traverse((child) => {
            if (child.isMesh) meshes.push(child);
          });
        } else {
          meshes.push(s.mesh);
        }
      });

      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const group = intersects[0].object.parent;
        if (hoveredGroup !== group && group.userData.glow) {
          if (hoveredGroup)
            gsap.to(hoveredGroup.userData.glow.material, {
              opacity: 0,
              duration: 0.4,
            });
          hoveredGroup = group;
          document.body.style.cursor = "pointer";
          // fade in the soft sprite glow
          gsap.to(hoveredGroup.userData.glow.material, {
            opacity: 0.8,
            duration: 0.4,
          });
        }
      } else {
        if (hoveredGroup) {
          gsap.to(hoveredGroup.userData.glow.material, {
            opacity: 0,
            duration: 0.3,
          });
          hoveredGroup = null;
          document.body.style.cursor = "default";
        }
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
      event.target.id === "manifesto-icon"
    )
      return;
    const deltaX = Math.abs(event.clientX - mouseDownPos.x);
    const deltaY = Math.abs(event.clientY - mouseDownPos.y);
    if (deltaX > clickThreshold || deltaY > clickThreshold) return;

    raycaster.setFromCamera(mouse, camera);
    if (horseDataRef) {
      const meshes = [];
      horseDataRef.activeSpheres.forEach((s) => {
        if (s.mesh.isGroup) {
          s.mesh.traverse((child) => {
            if (child.isMesh) meshes.push(child);
          });
        } else {
          meshes.push(s.mesh);
        }
      });
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        isPaused = true;
        const targetObj = intersects[0].object;
        const targetPos = new THREE.Vector3();
        targetObj.getWorldPosition(targetPos);

        // get scale from the group (parent)
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
      } else {
        isPaused = false;
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
    const { horseGroup, update, addUserSphere } = horseData;
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;

    createUserUI(db);
    onSnapshot(collection(db, "users"), (snap) => {
      snap.docChanges().forEach((c) => {
        if (c.type === "added") addUserSphere(c.doc.data().username);
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
      const globalActive = camDistFromOrigin < GLOBAL_LABEL_DIST;
      horseDataRef.activeSpheres.forEach((s) => {
        if (!s.label) return;
        const sphereWorldPos = new THREE.Vector3();
        s.mesh.getWorldPosition(sphereWorldPos);
        const distToSphere = camPos.distanceTo(sphereWorldPos);
        const isVisible = globalActive && distToSphere < INDIVIDUAL_CULL_DIST;
        s.label.element.style.opacity = isVisible ? "1" : "0";
      });
    }

    let timeScale = THREE.MathUtils.clamp(
      (camDistFromOrigin - FREEZE_DIST) / (FULL_SPEED_DIST - FREEZE_DIST),
      0,
      1,
    );
    if (isPaused) {
      timeScale = 0;
      if (camDistFromOrigin >= FULL_SPEED_DIST) isPaused = false;
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
