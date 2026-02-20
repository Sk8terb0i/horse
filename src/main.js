import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
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
  let horseMixer = null;

  // UI Elements
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

  // Theme Management
  let currentThemeIndex = 0;
  const themes = ["herd", "dolphin", "void"];

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
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    setTheme(themes[currentThemeIndex]);
    gsap.fromTo(
      themeDot,
      { scale: 1.5 },
      { scale: 1, duration: 0.4, ease: "back.out(2)" },
    );
  };

  // Manifesto Toggle
  icon.onclick = () => {
    manifestOverlay.classList.add("active");
    gsap.fromTo(
      ".m-body p",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, stagger: 0.1, duration: 1, ease: "power2.out" },
    );
  };

  document.addEventListener("click", (e) => {
    if (
      e.target.id === "manifesto-overlay-bg" ||
      e.target.id === "close-manifesto"
    ) {
      manifestOverlay.classList.remove("active");
    }
  });

  try {
    const horseData = await createHorse();
    const { horseGroup, update, addUserSphere, activeSpheres, mixer } =
      horseData;
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;
    horseMixer = mixer;

    // Default white spheres for visual mode
    activeSpheres.forEach((s) => {
      s.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    });

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
    if (horseUpdater) horseUpdater(timer.getDelta());
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
init();
