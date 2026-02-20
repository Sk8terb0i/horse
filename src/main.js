import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { Timer } from "three/src/core/Timer.js";

// Import directly from the sub-modules to ensure compatibility
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

// Initialize Firebase
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Better performance on high-res screens
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  // Use Timer instead of Clock to avoid deprecation warnings
  const timer = new Timer();
  let horseUpdater = null;

  try {
    const { horseGroup, update, addUserSphere } = await createHorse();

    // Slight rotation adjustment as per previous versions
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;

    // 1. Initialize the UI Component
    createUserUI(db);

    // 2. Real-time Sphere Sync
    onSnapshot(collection(db, "users"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") addUserSphere();
      });
    });
  } catch (error) {
    console.error("Error initializing horse:", error);
  }

  // Handle Window Resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate(timestamp) {
    requestAnimationFrame(animate);

    // Update Timer with the requestAnimationFrame timestamp
    timer.update(timestamp);
    const delta = timer.getDelta();

    controls.update();

    if (horseUpdater) {
      horseUpdater(delta);
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}

init();
