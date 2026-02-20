import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { LoreContent, ManifestoContent } from "./World/Components/Content.js"; // Import texts
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

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

  // 1. Lore Overlay (Big Horse Tap/Zoom)
  const loreOverlay = document.createElement("div");
  loreOverlay.id = "lore-overlay";
  loreOverlay.innerHTML = LoreContent;
  document.body.appendChild(loreOverlay);

  // 2. Manifesto Overlay (White Circle Tap)
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

  // Listeners
  icon.onclick = () => manifestOverlay.classList.add("active");
  document.addEventListener("click", (e) => {
    if (e.target.id === "close-manifesto")
      manifestOverlay.classList.remove("active");
    if (e.target.id === "close-lore") loreOverlay.classList.remove("active");
  });

  try {
    const { horseGroup, update, addUserSphere, leaderSphere, mixer } =
      await createHorse();

    // Default Rotation Logic
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleInteraction = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const dist = raycaster.ray.distanceToPoint(
        leaderSphere.getWorldPosition(new THREE.Vector3()),
      );

      // Proximity & Hover Logic
      if (dist < 0.15) {
        mixer.timeScale = THREE.MathUtils.mapLinear(
          Math.min(dist, 0.15),
          0,
          0.15,
          0.05,
          1.0,
        );
        if (dist < 0.04) {
          sphereLabel.innerText = "big horse";
          sphereLabel.style.display = "block";
          sphereLabel.style.left = x + 10 + "px";
          sphereLabel.style.top = y + 10 + "px";
          if (e.type === "click" || e.type === "touchstart")
            loreOverlay.classList.add("active");
        }
      } else {
        mixer.timeScale = 1.0;
        sphereLabel.style.display = "none";
      }
    };

    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("click", handleInteraction);

    // Zoom trigger
    controls.addEventListener("change", () => {
      if (camera.position.length() < 0.8) loreOverlay.classList.add("active");
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
