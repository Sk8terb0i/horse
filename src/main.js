import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/src/core/Timer.js";
import { createHorse } from "./World/Components/Horse.js";
import { createUserUI } from "./World/Components/UserUI.js";
import {
  LoreContent,
  ManifestoContent,
  UserLoreContent,
  ConnectionLoreContent,
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
  let leaderSphere = null;

  let connectionLines = null;
  let linesActive = false;

  const createOverlay = (id, content) => {
    const div = document.createElement("div");
    div.id = id;
    div.innerHTML = content;
    document.body.appendChild(div);
    return div;
  };

  const loreOverlay = createOverlay("lore-overlay", LoreContent);
  const userLoreOverlay = createOverlay("user-lore-overlay", UserLoreContent);
  const connectionOverlay = createOverlay(
    "connection-lore-overlay",
    ConnectionLoreContent,
  );
  const manifestOverlay = createOverlay("loading-overlay", ManifestoContent);

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
    <div class="nav-section">
      <span class="nav-meta">03</span>
      <div class="nav-item" id="nav-essence-horse">horse</div>
    </div>
  `;
  document.body.appendChild(archiveNav);

  const getThemeColors = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      big: style.getPropertyValue("--big-horse-color").trim() || "#fff5b5",
      user: style.getPropertyValue("--user-horse-color").trim() || "#ded2ff",
      white: "#ffffff",
    };
  };

  const setGlow = (type, active) => {
    allSpheres.forEach((s) => {
      const isLeader = s.mesh.userData.username === "big horse";
      if ((type === "big" && isLeader) || (type === "users" && !isLeader)) {
        const targetScale = active ? 2.5 : 1.0;
        const baseScale = isLeader ? 0.02 : 0.005;
        gsap.to(s.mesh.scale, {
          x: baseScale * targetScale,
          y: baseScale * targetScale,
          z: baseScale * targetScale,
          duration: 0.6,
          ease: "power2.out",
        });
      }
    });
  };

  const updateLines = () => {
    if (!connectionLines || !linesActive) return;
    const positions = [];
    const tempVecA = new THREE.Vector3();
    const tempVecB = new THREE.Vector3();
    allSpheres.forEach((s1, i) => {
      let nearestDist = Infinity;
      let nearestIdx = -1;
      s1.mesh.getWorldPosition(tempVecA);
      allSpheres.forEach((s2, j) => {
        if (i === j) return;
        s2.mesh.getWorldPosition(tempVecB);
        const d = tempVecA.distanceTo(tempVecB);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = j;
        }
      });
      if (nearestIdx !== -1) {
        allSpheres[nearestIdx].mesh.getWorldPosition(tempVecB);
        positions.push(
          tempVecA.x,
          tempVecA.y,
          tempVecA.z,
          tempVecB.x,
          tempVecB.y,
          tempVecB.z,
        );
      }
    });
    connectionLines.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    connectionLines.geometry.attributes.position.needsUpdate = true;
    connectionLines.computeLineDistances();
  };

  const toggleLines = (active) => {
    linesActive = active;
    if (active) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineDashedMaterial({
        color: 0x888888,
        dashSize: 0.05,
        gapSize: 0.03,
        transparent: true,
        opacity: 0,
      });
      connectionLines = new THREE.LineSegments(geometry, material);
      scene.add(connectionLines);
      gsap.to(material, { opacity: 0.8, duration: 0.5 });
    } else if (connectionLines) {
      gsap.to(connectionLines.material, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          scene.remove(connectionLines);
          connectionLines = null;
        },
      });
    }
  };

  const updateAppearance = () => {
    const colors = getThemeColors();
    if (horseMixer)
      gsap.to(horseMixer, {
        timeScale: isArchiveMode ? 0.1 : 1.0,
        duration: 1.5,
        ease: "power2.inOut",
      });
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
  const essenceLink = document.getElementById("nav-essence-horse");

  bigLink.onmouseenter = () => isArchiveMode && setGlow("big", true);
  bigLink.onmouseleave = () => setGlow("big", false);
  userLink.onmouseenter = () => isArchiveMode && setGlow("users", true);
  userLink.onmouseleave = () => setGlow("users", false);
  essenceLink.onmouseenter = () => isArchiveMode && toggleLines(true);
  essenceLink.onmouseleave = () => toggleLines(false);

  document.addEventListener("click", (e) => {
    // --- 1. Hashtag Filter Logic ---
    if (e.target.classList.contains("hashtag")) {
      const tag = e.target.innerText.replace("#", "").toLowerCase();

      loreOverlay.innerHTML = `
        <div class="lore-layout" id="search-results-bg">
          <div class="close-icon" id="close-search"></div>
          <div class="search-results-container">
            <div style="font-style: italic; color: #444; margin-bottom: 20px;">Filtering essence: #${tag}</div>
            <div id="results-target"></div>
          </div>
        </div>
      `;

      const target = loreOverlay.querySelector("#results-target");

      // We look at the full content strings now
      const library = [
        { html: LoreContent },
        { html: UserLoreContent },
        { html: ConnectionLoreContent },
      ];

      library.forEach((item) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(item.html, "text/html");

        // Check if the hashtag exists anywhere in this specific content
        const hasMatch =
          doc.querySelector(`[data-tags*="${tag}"]`) ||
          doc.querySelector(`.hashtag[data-tag="${tag}"]`);

        if (hasMatch) {
          const section = document.createElement("div");
          section.className = "result-item";

          const entryTitle = doc
            .querySelector(".lore-layout")
            .getAttribute("data-title");
          const iconSource = doc.querySelector(".lore-sphere-side").innerHTML;

          // Pull the full text side content instead of just the matches
          const fullContent = doc.querySelector(".lore-text-side").innerHTML;

          section.innerHTML = `
            <div class="result-header-title">${entryTitle}</div>
            <div class="result-icon-mini">${iconSource}</div>
            <div class="result-content">
              ${fullContent}
            </div>
          `;

          // Ensure all details are open in the search view
          section.querySelectorAll("details").forEach((d) => (d.open = true));

          target.appendChild(section);
        }
      });

      [manifestOverlay, userLoreOverlay, connectionOverlay].forEach((o) =>
        o.classList.remove("active"),
      );
      loreOverlay.classList.add("active");

      gsap.from(".result-item", {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.8,
        ease: "power2.out",
      });
      return;
    }

    // --- 2. Reliable Close Logic ---
    const isBg =
      e.target.id.includes("-bg") ||
      e.target.classList.contains("lore-layout") ||
      e.target.classList.contains("lore-sphere-side");
    const isClose =
      e.target.classList.contains("close-icon") ||
      e.target.id.includes("close-");

    if (isBg || isClose) {
      [
        manifestOverlay,
        loreOverlay,
        userLoreOverlay,
        connectionOverlay,
      ].forEach((o) => o.classList.remove("active"));

      setTimeout(() => {
        if (!loreOverlay.classList.contains("active")) {
          loreOverlay.innerHTML = LoreContent;
        }
      }, 500);
      return;
    }

    // --- 3. Navigation Clicks ---
    if (isArchiveMode) {
      const colors = getThemeColors();
      if (e.target.id === "nav-big-horse")
        animateOverlayIn(loreOverlay, colors.big);
      else if (e.target.id === "nav-the-horse")
        animateOverlayIn(userLoreOverlay, colors.user);
      else if (e.target.id === "nav-essence-horse")
        animateOverlayIn(connectionOverlay, "#fff");
    }
  });

  icon.onclick = () => animateOverlayIn(manifestOverlay, "#ffffff");

  try {
    const horseData = await createHorse();
    const { horseGroup, update, addUserSphere, activeSpheres, mixer } =
      horseData;
    leaderSphere = horseData.leaderSphere;
    horseGroup.rotation.y = THREE.MathUtils.degToRad(-20);
    scene.add(horseGroup);
    horseUpdater = update;
    allSpheres = activeSpheres;
    horseMixer = mixer;

    allSpheres.forEach(
      (s) =>
        (s.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff })),
    );

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    window.addEventListener("mousemove", (e) => {
      if (isArchiveMode || !leaderSphere) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const dist = raycaster.ray.distanceToPoint(
        leaderSphere.getWorldPosition(new THREE.Vector3()),
      );
      if (dist < 0.15 && dist < 0.04) {
        sphereLabel.innerText = "big horse";
        sphereLabel.style.display = "block";
        sphereLabel.style.left = e.clientX + 10 + "px";
        sphereLabel.style.top = e.clientY + 10 + "px";
      } else {
        sphereLabel.style.display = "none";
      }
    });

    createUserUI(db);
    onSnapshot(collection(db, "users"), (snap) => {
      snap.docChanges().forEach((c) => {
        if (c.type === "added") {
          addUserSphere(c.doc.data().username);
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
    if (linesActive) updateLines();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
init();
