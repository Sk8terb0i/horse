import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import { createConnections } from "./World/Components/Connections.js";
import { createOverlayUI } from "./World/Components/OverlayUI.js";
import { createSphereInteractions } from "./World/Components/SphereInteractions.js";
import { createTaskbar } from "./World/Components/Taskbar.js";
import { createAudioLibrary } from "./World/Components/AudioLibrary.js";
import { initGlueShelf } from "./World/Components/GlueShelf.js";
import { createMemoryModal } from "./World/Components/MemoryModal.js";
import { createXPLoader } from "./World/Components/XPLoader.js";
import { createVoidManager } from "./World/Components/VoidManager.js";
import { initWiki } from "./World/Components/WikiManager.js";
import { runWikiSeeder } from "./World/Components/seedWiki.js";
import { initDiscHorse } from "./World/Components/DiscHorse.js";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import gsap from "gsap";
import { createAudioManager } from "./World/Components/AudioManager.js";

// MOVED TO TOP LEVEL
import { createHorseSignaturesUI } from "./World/Components/HorseSignaturesUI.js";
import {
  initGlueFactory,
  unmountGlueFactory,
} from "./World/Components/GlueFactory/GlueFactory.js";

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

// Global State
let globalVoidMessages = [];
const signatureUI = createHorseSignaturesUI();
let globalSignatures = [];

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
  let globalUsersData = [];
  let isVoidMode = false;
  let horseUpdater = null;

  const timer = new Timer();
  const FREEZE_DIST = 0.4;
  const FULL_SPEED_DIST = 2.0;

  const conn = createConnections(scene);
  conn.lineMaterial.transparent = true;
  conn.lineMaterial.opacity = 0;

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
  const interactions = createSphereInteractions(
    camera,
    controls,
    conn,
    () => horseDataRef,
  );

  const ritualRoot = document.createElement("div");
  ritualRoot.id = "glue-factory-root";
  document.body.appendChild(ritualRoot);

  const memoryModal = createMemoryModal();
  const xpLoader = createXPLoader();
  const voidMgr = createVoidManager();

  const applyShelfState = (expanded, animate = false) => {
    if (!currentUsername || isVoidMode) return;
    const targetOpacity = expanded ? 0.5 : 0;
    gsap.to(conn.lineMaterial, {
      opacity: targetOpacity,
      duration: animate ? 0.5 : 0,
    });
    if (conn.lineLabelDiv) {
      conn.lineLabelDiv.style.opacity = expanded ? "1" : "0";
      conn.lineLabelDiv.style.pointerEvents = expanded ? "auto" : "none";
    }
  };

  const getManifestations = () => {
    let manifestations = [];
    globalUsersData.forEach((u) => {
      if (u.manifestations) {
        Object.values(u.manifestations).forEach((m) => {
          if (m.isBottled && m.finalImage && m.config) manifestations.push(m);
        });
      }
    });
    return manifestations;
  };

  window.VoidAPI_SubmitMessage = async (text) => {
    try {
      await addDoc(collection(db, "void_messages"), {
        text: text,
        user: currentUsername || "Anonymous",
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Ledger write failed", e);
    }
  };

  const glueShelf = initGlueShelf(
    currentUsername,
    memoryModal.showMemory,
    (exp) => applyShelfState(exp, true),
  );
  const audioLibrary = createAudioLibrary(currentUsername);
  // ZOOM TO SELF LOGIC
  const zoomToUserDot = () => {
    if (!currentUsername || !horseDataRef) return;

    // FIX: Look at s.username instead of s.mesh.name
    const target = horseDataRef.activeSpheres.find(
      (s) => s.username === currentUsername,
    );

    if (target) {
      const pos = new THREE.Vector3();
      target.mesh.getWorldPosition(pos);

      // Offset position for the Vista 'docking' view
      const offset = pos.clone().normalize().multiplyScalar(0.6);
      const camPos = pos.clone().add(offset);

      gsap.to(camera.position, {
        x: camPos.x,
        y: camPos.y,
        z: camPos.z,
        duration: 1.5,
        ease: "power3.inOut",
      });
      gsap.to(controls.target, {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration: 1.5,
        ease: "power3.inOut",
      });
    }
  };
  const overlay = createOverlayUI(
    scene,
    db,
    () => currentUsername,
    zoomToUserDot,
  );

  // --- NEW: Helper to check if any BLOCKING window is actively visible ---
  const isBlockingWindowOpen = () => {
    let isBlocked = false;

    // 1. Check Wiki (Paused only if visible)
    const wiki = document.getElementById("wiki-overlay");
    if (wiki && wiki.style.display !== "none") isBlocked = true;

    // 2. Check Disc:Horse (Paused only if visible)
    const forum = document.getElementById("dischorse-overlay");
    if (forum && forum.style.display !== "none") isBlocked = true;

    // 3. Check Audio Library (Paused only if visible)
    const audioWindows = document.querySelectorAll(".vista-window");
    for (let i = 0; i < audioWindows.length; i++) {
      if (
        audioWindows[i].innerHTML.includes("Media Player") &&
        audioWindows[i].style.display !== "none"
      ) {
        isBlocked = true;
        break;
      }
    }

    // NOTE: GlueShelf is intentionally EXCLUDED from this check so it never pauses the animation!
    return isBlocked;
  };

  const toggleDesktopIcons = (show) => {
    const icons = [
      document.getElementById("wiki-desktop-icon"),
      document.getElementById("dischorse-icon"),
      document.getElementById("audio-library-standalone"),
      glueShelf.folderIcon,
    ];
    icons.forEach((icon) => {
      if (icon) icon.style.display = show ? "flex" : "none";
    });
  };

  const handleThemeChange = (themeId) => {
    if (themeId === "void") {
      isVoidMode = true;
      renderer.domElement.style.display = "none";
      lDom.style.display = "none";
      toggleDesktopIcons(false); // Hide icons in the void
      if (glueShelf.wrapper) glueShelf.wrapper.style.display = "none";
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "none";
      voidMgr.start(getManifestations(), globalVoidMessages);
    } else {
      isVoidMode = false;
      voidMgr.stop();
      if (window.location.hash !== "#/ritual") {
        renderer.domElement.style.display = "block";
        lDom.style.display = "block";
        if (currentUsername) {
          toggleDesktopIcons(true); // Restore icons
          if (glueShelf.wrapper)
            glueShelf.wrapper.style.display = glueShelf.isExpanded()
              ? "flex"
              : "none";
          const ui = document.getElementById("logged-in-ui");
          if (ui) ui.style.display = "block";
        }
      }
    }
  };

  const taskbar = createTaskbar(scene, handleThemeChange);
  if (!currentUsername) taskbar.style.display = "none";

  function handleNavigation() {
    const hash = window.location.hash;
    const isRitual = hash === "#/ritual";
    const currentTheme = localStorage.getItem("horse_herd_theme") || "herd";

    const executeSwap = () => {
      if (isRitual) {
        voidMgr.stop();
        renderer.domElement.style.display = "none";
        lDom.style.display = "none";
        toggleDesktopIcons(false); // Hide icons during ritual
        if (glueShelf.wrapper) glueShelf.wrapper.style.display = "none";
        taskbar.style.display = "none";
        applyShelfState(false, false);
        const ui = document.getElementById("logged-in-ui");
        if (ui) ui.style.display = "none";
        ritualRoot.style.display = "block";
        initGlueFactory(ritualRoot, db, currentUsername);
      } else {
        ritualRoot.style.display = "none";
        unmountGlueFactory();
        if (currentTheme === "void") {
          isVoidMode = true;
          renderer.domElement.style.display = "none";
          lDom.style.display = "none";
          taskbar.style.display = "flex";
          toggleDesktopIcons(false); // Ensure hidden in void
          voidMgr.start(getManifestations(), globalVoidMessages);
        } else {
          isVoidMode = false;
          renderer.domElement.style.display = "block";
          lDom.style.display = "block";
          if (currentUsername) {
            toggleDesktopIcons(true); // Restore icons
            if (glueShelf.wrapper)
              glueShelf.wrapper.style.display = glueShelf.isExpanded()
                ? "flex"
                : "none";
            taskbar.style.display = "flex";
            applyShelfState(glueShelf.isExpanded(), false);
            const ui = document.getElementById("logged-in-ui");
            if (ui) ui.style.display = "block";
          }
        }
      }
    };
    isInitialLoad
      ? (executeSwap(), (isInitialLoad = false))
      : xpLoader.triggerLoad(executeSwap);
  }

  let isInitialLoad = true;
  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  let initialSync = true;
  const addedUsers = new Set();

  onSnapshot(collection(db, "users"), (snap) => {
    globalUsersData = snap.docs.map((doc) => doc.data());
    glueShelf.update(globalUsersData);

    const currentTheme = localStorage.getItem("horse_herd_theme") || "herd";
    if (currentTheme === "void" && currentUsername) {
      const manifestations = getManifestations();
      if (manifestations.length > 0) voidMgr.start(manifestations);
    }

    if (!initialSync) {
      snap.docChanges().forEach((c) => {
        const data = c.doc.data();
        if (c.type === "added") addUserToScene(data);
        if (c.type === "modified" && horseDataRef)
          horseDataRef.updateUserColor(
            data.username,
            data.innerColor,
            !!data.password,
          );
      });
      return;
    }

    // --- DATA IS NOW READY ---
    initialSync = false;
    globalUsersData.forEach((userData) => addUserToScene(userData));

    // NEW: Trigger startup check now that we have your DB info
    handleStartup();
  });

  function addUserToScene(data) {
    if (addedUsers.has(data.username)) return;
    addedUsers.add(data.username);
    if (horseDataRef)
      horseDataRef.addUserSphere(
        data.username,
        data.innerColor,
        !!data.password,
      );
    if (data.username === currentUsername && data.innerColor)
      overlay.setInitialColor(data.innerColor);
  }

  try {
    const horseData = await createHorse();
    horseDataRef = horseData;
    horseData.horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseData.horseGroup);
    horseUpdater = horseData.update;
    createUserUI(db, overlay, horseData);
    if (currentUsername) {
      overlay.showMainUI();
      overlay.setUsername(currentUsername);
      createAudioManager();
    }
  } catch (err) {
    console.warn("3D Horse Failed to Load:", err);
  }

  function animate(ts) {
    requestAnimationFrame(animate);
    if (window.location.hash === "#/ritual" || isVoidMode) return;

    const delta = timer.getDelta();
    timer.update(ts);
    controls.update();
    const camPos = camera.position;
    const camDistFromOrigin = camPos.length();

    if (horseDataRef) {
      if (conn.lineMaterial.opacity > 0) conn.updateConnections(horseDataRef);
      const globalActive = camDistFromOrigin < 1.6;

      horseDataRef.activeSpheres.forEach((s) => {
        if (!s.label || !s.mesh.visible) return;
        const sphereWorldPos = new THREE.Vector3();
        s.mesh.getWorldPosition(sphereWorldPos);

        const isTargeted =
          globalActive && camPos.distanceTo(sphereWorldPos) < 0.8;
        const targetOpacity = isTargeted ? "1" : "0";

        if (
          isTargeted &&
          !s.label.element.querySelector(".aero-signature-container")
        ) {
          // FIX: Look at s.username, NOT s.mesh.name
          const username = s.username;
          const randomSig = signatureUI.getRandomSignature(username);

          // Check if this dot belongs to the logged-in user
          const isCurrentUserDot =
            currentUsername && username === currentUsername;

          if (randomSig) {
            s.label.element.insertAdjacentHTML(
              "afterbegin",
              signatureUI.getSignatureHTML(randomSig, isCurrentUserDot),
            );

            // If it's your dot, make the image clickable to redraw
            if (isCurrentUserDot) {
              const sigDiv = s.label.element.querySelector(
                ".aero-signature-container",
              );
              if (sigDiv) {
                sigDiv.onclick = (e) => {
                  e.stopPropagation();
                  // Re-open the Policy Manager
                  import("./World/Components/PolicyManager.js").then(
                    (module) => {
                      module.createPolicyManager(db, currentUsername, () => {
                        // Remove the old image so the next frame grabs the new one
                        sigDiv.remove();
                      });
                    },
                  );
                };
              }
            }
          } else {
            // Invisible placeholder so it doesn't crash if they have no drawing
            s.label.element.insertAdjacentHTML(
              "afterbegin",
              '<div class="aero-signature-container" style="display:none;"></div>',
            );
          }
        } else if (!isTargeted) {
          const existing = s.label.element.querySelector(
            ".aero-signature-container",
          );
          if (existing) existing.remove();
        }

        s.label.element.style.opacity = targetOpacity;
      });
    }

    let timeScale = THREE.MathUtils.clamp(
      (camDistFromOrigin - FREEZE_DIST) / (FULL_SPEED_DIST - FREEZE_DIST),
      0,
      1,
    );

    // Force timescale to 0 (pause) if a blocking window is visibly open or if paused by sphere hover
    if (interactions.getIsPaused() || isBlockingWindowOpen()) {
      timeScale = 0;
      // Resume interactions if we zoom out and no blocking windows are open
      if (camDistFromOrigin >= FULL_SPEED_DIST && !isBlockingWindowOpen()) {
        interactions.setIsPaused(false);
      }
    }

    if (horseUpdater) horseUpdater(delta * timeScale, camera);

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

  onSnapshot(
    query(
      collection(db, "void_messages"),
      orderBy("timestamp", "desc"),
      limit(30),
    ),
    (snap) => {
      globalVoidMessages = snap.docs.map((doc) => doc.data());
      const theme = localStorage.getItem("horse_herd_theme");
      if (theme === "void" && currentUsername) {
        voidMgr.start(getManifestations(), globalVoidMessages);
      }
    },
  );

  // Improved startup that waits for database data
  const startApp = () => {
    if (currentUsername) {
      const currentUserData = globalUsersData.find(
        (u) => u.username === currentUsername,
      );

      // Show UI elements
      overlay.showMainUI();
      taskbar.style.display = "flex";
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "block";

      // Initialize Wiki with correct role
      const userRole = currentUserData ? currentUserData.role : "user";
      initWiki(db, currentUsername, userRole);
      initDiscHorse(db, currentUsername, userRole);
    }
  };

  // NEW: Robust startup that checks DB first, then local fallback
  const handleStartup = async () => {
    if (!currentUsername || window.location.hash === "#/ritual") {
      startApp();
      return;
    }

    // Check the database for the permanent flag
    const userData = globalUsersData.find(
      (u) => u.username.toLowerCase() === currentUsername.toLowerCase(),
    );
    const hasAgreedDB = userData && userData.policyAgreed === true;
    const hasAgreedLocal = localStorage.getItem(
      `policy_agreed_${currentUsername}`,
    );

    // If both are missing, show the policy
    if (!hasAgreedDB && !hasAgreedLocal) {
      taskbar.style.display = "none";
      const ui = document.getElementById("logged-in-ui");
      if (ui) ui.style.display = "none";

      const module = await import("./World/Components/PolicyManager.js");
      // This will now internally check signatures too
      await module.createPolicyManager(db, currentUsername, () => {
        startApp();
      });
    } else {
      // User is already cleared in DB or LocalStorage
      startApp();
    }
  };

  // SIGNATURE SYNC
  onSnapshot(collection(db, "policy_signatures"), (snap) => {
    globalSignatures = snap.docs.map((doc) => doc.data());
    signatureUI.updateSignatures(globalSignatures);
  });

  //runWikiSeeder(db);
}

init();
