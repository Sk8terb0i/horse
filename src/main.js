import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import {
  LoreContent,
  ManifestoContent,
  UserLoreContent,
} from "./World/Components/Content.js";
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
    0.1,
    1000,
  );
  camera.position.set(0, 0, 2.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const timer = new Timer();
  let horseUpdater = null;
  let isArchiveMode = false;
  let allSpheres = [];
  let horseMixer = null;

  // --- UI Elements ---
  const loreOverlay = document.createElement("div");
  loreOverlay.id = "lore-overlay";
  loreOverlay.innerHTML = LoreContent;
  document.body.appendChild(loreOverlay);

  const userLoreOverlay = document.createElement("div");
  userLoreOverlay.id = "user-lore-overlay";
  userLoreOverlay.innerHTML = UserLoreContent;
  document.body.appendChild(userLoreOverlay);

  const manifestOverlay = document.createElement("div");
  manifestOverlay.id = "loading-overlay";
  manifestOverlay.innerHTML = ManifestoContent;
  document.body.appendChild(manifestOverlay);

  const sphereLabel = document.createElement("div");
  sphereLabel.id = "sphere-label";
  document.body.appendChild(sphereLabel);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  document.body.appendChild(icon);

  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "toggle-wrapper";
  toggleWrapper.innerHTML = `
    <span class="toggle-label active" id="label-visual">visual</span>
    <label class="switch">
      <input type="checkbox" id="archive-checkbox">
      <span class="slider"></span>
    </label>
    <span class="toggle-label" id="label-archive">archive</span>
  `;
  document.body.appendChild(toggleWrapper);

  const archiveNav = document.createElement("div");
  archiveNav.id = "archive-nav";
  archiveNav.innerHTML = `
    <div class="nav-section">
      <span class="nav-meta">01</span>
      <div class="nav-item" id="nav-big-horse">big horse</div>
    </div>
    <div class="nav-section">
      <span class="nav-meta">02</span>
      <div class="nav-item" id="nav-the-horse">the horse</div>
    </div>
  `;
  document.body.appendChild(archiveNav);

  // --- Theme Helpers ---
  const getThemeColors = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      big: style.getPropertyValue("--big-horse-color").trim() || "#ffdd00",
      user: style.getPropertyValue("--user-horse-color").trim() || "#00ffcc",
      white: "#ffffff",
    };
  };

  const updateAppearance = () => {
    const colors = getThemeColors();
    if (horseMixer) {
      gsap.to(horseMixer, {
        timeScale: isArchiveMode ? 0.1 : 1.0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
    allSpheres.forEach((s) => {
      const isLeader = s.mesh.userData.username === "big horse";
      const targetColor = isArchiveMode
        ? isLeader
          ? colors.big
          : colors.user
        : colors.white;
      gsap.to(s.mesh.material.color, {
        ...new THREE.Color(targetColor),
        duration: 0.8,
      });
    });
  };

  const animateOverlayIn = (overlay, color) => {
    overlay.classList.add("active");

    const staticSphere = overlay.querySelector(".static-glow-sphere");
    if (staticSphere) staticSphere.style.backgroundColor = color;

    const content = overlay.querySelectorAll(
      ".centered-content > *, .manifesto-inner > *, .lore-sphere-side",
    );
    gsap.fromTo(
      content,
      { opacity: 0, x: 30 },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power4.out",
        delay: 0.2,
      },
    );
  };

  const setGlow = (type, active) => {
    allSpheres.forEach((s) => {
      const isLeader = s.mesh.userData.username === "big horse";
      if ((type === "big" && isLeader) || (type === "users" && !isLeader)) {
        const targetScale = active ? 1.6 : 1.0;
        const baseScale = isLeader ? 0.02 : 0.005;
        gsap.to(s.mesh.scale, {
          x: baseScale * targetScale,
          y: baseScale * targetScale,
          z: baseScale * targetScale,
          duration: 0.4,
          ease: "back.out(2)",
        });
      }
    });
  };

  // --- Listeners ---
  document.getElementById("archive-checkbox").onchange = (e) => {
    isArchiveMode = e.target.checked;
    document
      .getElementById("label-visual")
      .classList.toggle("active", !isArchiveMode);
    document
      .getElementById("label-archive")
      .classList.toggle("active", isArchiveMode);
    archiveNav.classList.toggle("visible", isArchiveMode);
    updateAppearance();
  };

  const bigLink = document.getElementById("nav-big-horse");
  const userLink = document.getElementById("nav-the-horse");

  bigLink.onmouseenter = () => isArchiveMode && setGlow("big", true);
  bigLink.onmouseleave = () => setGlow("big", false);
  userLink.onmouseenter = () => isArchiveMode && setGlow("users", true);
  userLink.onmouseleave = () => setGlow("users", false);

  icon.onclick = () => animateOverlayIn(manifestOverlay, "#ffffff");

  document.addEventListener("click", (e) => {
    // 1. Close logic: Triggered by close icons OR clicking the overlay background (layout containers)
    const isOverlayContainer =
      e.target.classList.contains("lore-layout") ||
      e.target.classList.contains("manifesto-layout") ||
      e.target.classList.contains("lore-sphere-side");
    const isCloseIcon = e.target.classList.contains("close-icon");

    if (isCloseIcon || isOverlayContainer) {
      manifestOverlay.classList.remove("active");
      loreOverlay.classList.remove("active");
      userLoreOverlay.classList.remove("active");
      return; // Stop execution here if we are closing
    }

    // 2. Archive Navigation Clicks
    if (isArchiveMode) {
      const colors = getThemeColors();
      if (e.target.id === "nav-big-horse")
        animateOverlayIn(loreOverlay, colors.big);
      if (e.target.id === "nav-the-horse")
        animateOverlayIn(userLoreOverlay, colors.user);
    }
  });

  try {
    const {
      horseGroup,
      update,
      addUserSphere,
      activeSpheres,
      leaderSphere,
      mixer,
    } = await createHorse();
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;
    allSpheres = activeSpheres;
    horseMixer = mixer;

    allSpheres.forEach((s) => {
      s.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener("mousemove", (e) => {
      if (isArchiveMode) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const dist = raycaster.ray.distanceToPoint(
        leaderSphere.getWorldPosition(new THREE.Vector3()),
      );

      if (dist < 0.15) {
        if (dist < 0.04) {
          sphereLabel.innerText = "big horse";
          sphereLabel.style.display = "block";
          sphereLabel.style.left = e.clientX + 10 + "px";
          sphereLabel.style.top = e.clientY + 10 + "px";
        }
      } else {
        sphereLabel.style.display = "none";
      }
    });

    createUserUI(db);
    onSnapshot(collection(db, "users"), (snap) => {
      snap.docChanges().forEach((c) => {
        if (c.type === "added") {
          addUserSphere(c.doc.data().username);
          const newSphere = activeSpheres[activeSpheres.length - 1];
          newSphere.mesh.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
          });
          if (isArchiveMode) updateAppearance();
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
    if (horseUpdater) horseUpdater(timer.getDelta());
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

init();
