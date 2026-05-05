import * as THREE from "three";
import gsap from "gsap";
import { createLoneDots, LONE_CONFIG } from "./LoneDots.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function createLoneManager(
  scene,
  camera,
  domElement,
  controls,
  signatureUI,
) {
  let isActive = false,
    isFramed = false;
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2();
  const loneDots = createLoneDots();
  scene.add(loneDots.group);
  let oldEnablePan = true;
  let currentSigUrl = null;

  const onMouseMove = (event) => {
    if (!isActive) return;
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hit = loneDots.checkIntersections(raycaster);
    domElement.style.cursor =
      hit.bigHorse || hit.innerHorse || hit.userHorse ? "pointer" : "default";
  };

  const onClick = (event) => {
    if (!isActive) return;
    raycaster.setFromCamera(mouse, camera);
    const hit = loneDots.checkIntersections(raycaster);

    if (hit.bigHorse) {
      if (!isFramed) {
        isFramed = true;
        loneDots.triggerFraming();
        gsap.to(camera.position, {
          z: LONE_CONFIG.framedZoom,
          duration: 1.5,
          ease: "power3.inOut",
        });
      } else {
        isFramed = false;
        loneDots.resetFraming();
        gsap.to(camera.position, {
          z: LONE_CONFIG.defaultZoom,
          duration: 1.5,
          ease: "power3.inOut",
        });
      }
    } else if (hit.innerHorse) {
      loneDots.toggleColorPicker();
    } else if (hit.userHorse && isFramed) {
      // Redraw drawing when sphere is clicked while zoomed in
      import("./PolicyManager.js").then((module) => {
        module.createPolicyManager(window.__dbRef, window.__userRef, () => {
          currentSigUrl = null; // Forces re-fetch and update to texture
        });
      });
    }
  };

  return {
    start: async (currentUsername, fallbackColorHex, horseDataRef, db) => {
      if (isActive) return;
      isActive = true;
      isFramed = false;
      currentSigUrl = null;
      window.__dbRef = db;
      window.__userRef = currentUsername;

      oldEnablePan = controls.enablePan;
      controls.enablePan = false;
      if (horseDataRef) horseDataRef.horseGroup.visible = false;

      let trueColor = fallbackColorHex;
      if (db && currentUsername) {
        try {
          const snap = await getDoc(doc(db, "users", currentUsername));
          if (snap.exists() && snap.data().innerColor)
            trueColor = snap.data().innerColor;
        } catch (e) {
          console.warn("Lone fetch failed", e);
        }
      }

      loneDots.init(
        currentUsername,
        trueColor,
        getComputedStyle(document.documentElement).getPropertyValue(
          "--big-horse-color",
        ) || "#ffeab5",
        (newHex) => {
          if (db && currentUsername)
            setDoc(
              doc(db, "users", currentUsername),
              { innerColor: newHex },
              { merge: true },
            );
        },
      );

      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: LONE_CONFIG.defaultZoom,
        duration: 1.5,
        ease: "power3.inOut",
      });
      gsap.to(controls.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power3.inOut",
      });

      domElement.addEventListener("click", onClick);
      domElement.addEventListener("mousemove", onMouseMove);
    },

    update: (delta, activeCamera) => {
      if (!isActive) return;
      loneDots.update(delta, activeCamera);

      // If we are framed and don't have a signature yet, keep polling for it
      if (signatureUI && !currentSigUrl) {
        const randomSig = signatureUI.getRandomSignature(window.__userRef);
        if (randomSig && randomSig.drawing) {
          currentSigUrl = randomSig.drawing;
          loneDots.applySignatureTexture(currentSigUrl);
        }
      }
    },

    stop: (horseDataRef) => {
      if (!isActive) return;
      isActive = false;
      controls.enablePan = oldEnablePan;
      domElement.removeEventListener("click", onClick);
      domElement.removeEventListener("mousemove", onMouseMove);
      loneDots.dispose();
      gsap.to(camera.position, { z: 2.5, duration: 1.5, ease: "power3.inOut" });
      if (horseDataRef) horseDataRef.horseGroup.visible = true;
    },
  };
}
