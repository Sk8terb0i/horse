import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js"; // Import the component

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
  // ... Standard Scene Setup (Camera, Renderer, Controls) ...
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
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  const clock = new THREE.Clock();
  let horseUpdater = null;

  try {
    const { horseGroup, update, addUserSphere } = await createHorse();
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
    console.error(error);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (horseUpdater) horseUpdater(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

init();
