import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
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
  raycaster.params.Line.threshold = 0.02; // threshold for clicking thin dashed lines
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

  // --- connection lines setup ---
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  const lineMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.01,
    gapSize: 0.01,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  // single label for the lines
  const lineLabelDiv = document.createElement("div");
  lineLabelDiv.className = "sphere-label";
  lineLabelDiv.innerText = "horse";
  lineLabelDiv.style.opacity = "0";
  const lineLabel = new CSS2DObject(lineLabelDiv);
  scene.add(lineLabel);

  const updateConnections = () => {
    lineGroup.clear();
    if (!horseDataRef) return;

    const spheres = horseDataRef.activeSpheres;
    const spherePositions = spheres.map((s) => {
      const pos = new THREE.Vector3();
      s.mesh.getWorldPosition(pos);
      return pos;
    });

    for (let i = 0; i < spherePositions.length; i++) {
      const posA = spherePositions[i];
      const distances = [];
      for (let j = 0; j < spherePositions.length; j++) {
        if (i === j) continue;
        distances.push({
          pos: spherePositions[j],
          dist: posA.distanceTo(spherePositions[j]),
        });
      }
      distances.sort((a, b) => a.dist - b.dist);

      for (let n = 0; n < Math.min(3, distances.length); n++) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          posA,
          distances[n].pos,
        ]);
        const line = new THREE.Line(geometry, lineMaterial);
        line.userData = { start: posA.clone(), end: distances[n].pos.clone() };
        line.computeLineDistances();
        lineGroup.add(line);
      }
    }
  };

  // --- ui setup ---
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

  const handleLineInteraction = (intersects) => {
    const lineIntersect = intersects.find((hit) => hit.object.type === "Line");
    if (lineIntersect) {
      const line = lineIntersect.object;
      const midPoint = new THREE.Vector3()
        .addVectors(line.userData.start, line.userData.end)
        .multiplyScalar(0.5);
      lineLabel.position.copy(midPoint);
      lineLabelDiv.style.opacity = "1";
    }
  };

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (horseDataRef) {
      const targets = [];
      horseDataRef.activeSpheres.forEach((s) => {
        if (s.mesh.isGroup) {
          s.mesh.traverse((child) => {
            if (child.isMesh && child.type !== "Sprite") targets.push(child);
          });
        } else {
          targets.push(s.mesh);
        }
      });
      // add lines to detection list if they are visible
      if (lineMaterial.opacity > 0)
        lineGroup.children.forEach((l) => targets.push(l));

      const intersects = raycaster.intersectObjects(targets);

      // handle line hover
      handleLineInteraction(intersects);

      // handle sphere hover
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
      const targets = [];
      horseDataRef.activeSpheres.forEach((s) => {
        if (s.mesh.isGroup) {
          s.mesh.traverse((child) => {
            if (child.isMesh && child.type !== "Sprite") targets.push(child);
          });
        } else {
          targets.push(s.mesh);
        }
      });
      if (lineMaterial.opacity > 0)
        lineGroup.children.forEach((l) => targets.push(l));

      const intersects = raycaster.intersectObjects(targets);

      // handle line click
      handleLineInteraction(intersects);

      const sphereHit = intersects.find((hit) => hit.object.type === "Mesh");

      if (sphereHit) {
        isPaused = true;
        gsap.to(lineMaterial, { opacity: 0.4, duration: 1 });

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
      } else {
        // click background
        isPaused = false;
        gsap.to(lineMaterial, { opacity: 0, duration: 0.5 });
        lineLabelDiv.style.opacity = "0"; // hide connection label on reset

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
      if (lineMaterial.opacity > 0) {
        updateConnections();
      }

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
      if (camDistFromOrigin >= FULL_SPEED_DIST) {
        isPaused = false;
        gsap.to(lineMaterial, { opacity: 0, duration: 0.5 });
        lineLabelDiv.style.opacity = "0";
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
