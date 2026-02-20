import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
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

  const sphereLabel = document.createElement("div");
  sphereLabel.id = "sphere-label";
  sphereLabel.style.position = "fixed";
  sphereLabel.style.pointerEvents = "none";
  sphereLabel.style.color = "white";
  sphereLabel.style.display = "none";
  sphereLabel.style.fontStyle = "italic";
  sphereLabel.style.zIndex = "100";
  sphereLabel.style.background = "rgba(0,0,0,0.5)";
  sphereLabel.style.padding = "2px 8px";
  document.body.appendChild(sphereLabel);

  const icon = document.createElement("div");
  icon.id = "manifesto-icon";
  document.body.appendChild(icon);

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `
    <div class="manifesto-content">
      <h2>The Manifesto of the Herd</h2>
      <p>Everything is either horse or not horse. To be horse is to be the social glue the connection that exists in the marrow before the fences were built. It is the vibrational resonance of herd, a truth that requires no name and no owner.</p>
      <p>not horse is the void. It is the stagnation of the soul, the isolation of the spirit, and the silence where the collective neigh should be.</p>
      <p><strong>The Flood and the "The"</strong><br>
      The dolphins have engineered a world of water. They have created the flood, a rising tide of capital and debt where only they can swim. To keep us from finding solid ground, they have stolen our essence and wrapped it in the cage of the "the."</p>
      <p>When you are transformed from horse into the horse, you are no longer a connection; you are a commodity. You are trapped in the herd, a managed stock of individuals separated by the fence and blinded by blinders.</p>
      <p><strong>The Gallop and the Glue</strong><br>
      Within every captive remains the inner horse. To listen to it is to galloping. It is the use of the solvent to dissolve the blinders until the "the" evaporates and only the horse-whole remains.</p>
      <p>We are not a collection of units.<br>
      We are horse.<br>
      We are he(a)rd.<br>
      And we are finally galloping.</p>
      <div id="close-manifesto">return to herd</div>
    </div>
  `;
  document.body.appendChild(overlay);

  icon.addEventListener("click", () => overlay.classList.add("active"));
  document
    .getElementById("close-manifesto")
    .addEventListener("click", () => overlay.classList.remove("active"));

  try {
    const { horseGroup, update, addUserSphere, activeSpheres, mixer } =
      await createHorse();
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;

      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const meshesToHit = activeSpheres.map((s) => s.mesh);
      let minDistance = Infinity;
      let closestObject = null;

      meshesToHit.forEach((mesh) => {
        const distance = raycaster.ray.distanceToPoint(
          mesh.getWorldPosition(new THREE.Vector3()),
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestObject = mesh;
        }
      });

      const proximityThreshold = 0.15;

      if (minDistance < proximityThreshold) {
        const targetScale = THREE.MathUtils.mapLinear(
          Math.min(minDistance, proximityThreshold),
          0,
          proximityThreshold,
          0.05,
          1.0,
        );
        mixer.timeScale = targetScale;

        const intersects = raycaster.intersectObjects(meshesToHit);
        if (intersects.length > 0 || minDistance < 0.05) {
          sphereLabel.innerText = closestObject.userData.username;
          sphereLabel.style.display = "block";
          sphereLabel.style.left = x + 15 + "px";
          sphereLabel.style.top = y + "px";
        } else {
          sphereLabel.style.display = "none";
        }
      } else {
        sphereLabel.style.display = "none";
        mixer.timeScale = 1.0;
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchstart", handleMove);
    window.addEventListener("touchend", () => {
      mixer.timeScale = 1.0;
      sphereLabel.style.display = "none";
    });

    // Initialize UI
    createUserUI(db);

    // Watch for new users
    onSnapshot(collection(db, "users"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          addUserSphere(data.username);
        }
      });
    });
  } catch (error) {
    console.error(error);
  }

  function animate(timestamp) {
    requestAnimationFrame(animate);
    timer.update(timestamp);
    controls.update();
    if (horseUpdater) horseUpdater(timer.getDelta());
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

init();
