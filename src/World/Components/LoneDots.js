import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNearestColorName } from "../Utils/ColorUtils.js";
import gsap from "gsap";

export const LONE_CONFIG = {
  defaultZoom: 1.5,
  framedZoom: 0.8,
  bhSize: 0.2,
  uSize: 0.05,
  ihSize: 0.025,
  userOrbitRadius: 0.6,
  userOrbitSpeed: 0.2,
  innerOrbitRadius: 0.15,
  innerOrbitSpeed: -0.8,
  gapBigHorse: 1.2,
  gapUser: 1.5,
  gapInner: 1.5,
  lineGap: 0.03, // Slightly larger gap for cleaner look
  shrinkFactorRadii: 0.5,
  shrinkFactorSpeeds: 1.0,
  shrinkFactorGaps: 0,
};

// --- Utils ---
const hsvToRgb = (h, s, v) => {
  let r,
    g,
    b,
    i = Math.floor(h * 6),
    f = h * 6 - i,
    p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};
const rgbToHex = (r, g, b) =>
  "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

export function createLoneDots() {
  const group = new THREE.Group();
  let bhGroup, uGroup, ihGroup, line1, line2;
  let uAngle = 0,
    ihAngle = 0;

  const animState = { uiOpacity: 0, orbitFactor: 1.0 };
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

  const createSphere = (scale, colorHex, labelText, isInnerHorse = false) => {
    const g = new THREE.Group();
    const innerMat = new THREE.MeshBasicMaterial({
      color: colorHex || 0xffffff,
      transparent: true,
    });
    const inner = new THREE.Mesh(sphereGeometry, innerMat);
    inner.renderOrder = 999;

    if (!isInnerHorse) {
      const core = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }),
      );
      inner.scale.setScalar(0.6);
      g.add(core);
    }
    g.add(inner);
    g.scale.setScalar(scale);

    const div = document.createElement("div");
    div.style.cssText =
      "color:white; text-shadow:1px 1px 2px black; white-space:nowrap; font-family:serif; pointer-events:none;";
    div.innerHTML = `<div>${labelText}</div>`;

    const label = new CSS2DObject(div);
    label.center.set(0, 0.5);
    g.add(label);
    g.userData = { inner, label, nameLine: div.firstChild };
    return g;
  };

  const createAeroPicker = (initialHex, onColorSelect) => {
    const p = document.createElement("div");
    p.style.cssText = `position:absolute; width:260px; background:rgba(255,255,255,0.2); backdrop-filter:blur(25px) saturate(180%); border:1px solid rgba(255,255,255,0.5); border-radius:15px; box-shadow:0 15px 40px rgba(0,0,0,0.5); display:none; flex-direction:column; z-index:10000; top:-100px; left:80px; pointer-events:auto; font-family:sans-serif; overflow:hidden;`;
    p.innerHTML = `
      <div id="drag-h" style="height:32px; background:linear-gradient(rgba(122,188,255,0.9), rgba(64,150,238,0.9)); color:white; display:flex; align-items:center; justify-content:space-between; padding:0 15px; cursor:move; font-weight:bold; font-size:12px;">
        <span>Hue Selection</span><div id="close-p" style="cursor:pointer; font-size:16px;">✕</div>
      </div>
      <div style="padding:15px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; gap:12px; align-items:center;">
          <canvas id="spec" width="120" height="110" style="border-radius:5px; border:1px solid rgba(0,0,0,0.2); cursor:crosshair;"></canvas>
          <canvas id="val" width="20" height="110" style="border-radius:5px; border:1px solid rgba(0,0,0,0.2); cursor:ns-resize;"></canvas>
          <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
            <div id="prev" style="height:40px; border-radius:6px; border:2px solid white; background:${initialHex};"></div>
            <input id="hex-in" type="text" value="${initialHex}" style="width:100%; border:1px solid #ccc; border-radius:4px; text-align:center; font-size:10px; padding:2px;">
          </div>
        </div>
        <button id="save-p" style="background:linear-gradient(#fff, #ccc); border:1px solid #999; border-radius:20px; padding:6px; font-weight:bold; cursor:pointer; font-size:11px;">Confirm</button>
      </div>`;

    let isD = false,
      sx,
      sy,
      il,
      it;
    const h = p.querySelector("#drag-h");
    h.onmousedown = (e) => {
      isD = true;
      sx = e.clientX;
      sy = e.clientY;
      il = parseInt(p.style.left) || 80;
      it = parseInt(p.style.top) || -100;
      e.preventDefault();
    };
    window.addEventListener("mousemove", (e) => {
      if (isD) {
        p.style.left = il + (e.clientX - sx) + "px";
        p.style.top = it + (e.clientY - sy) + "px";
      }
    });
    window.addEventListener("mouseup", () => (isD = false));

    const spectrum = p.querySelector("#spec"),
      valS = p.querySelector("#val"),
      prev = p.querySelector("#prev"),
      hexIn = p.querySelector("#hex-in");
    let cH = 0,
      cS = 0,
      cV = 1;
    const update = () => {
      const rgb = hsvToRgb(cH, cS, cV),
        hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      hexIn.value = hex;
      prev.style.background = hex;
      onColorSelect(hex);
    };
    spectrum.onmousedown = (e) => {
      const r = spectrum.getBoundingClientRect();
      cH = (e.clientX - r.left) / 120;
      cS = 1 - (e.clientY - r.top) / 110;
      update();
    };
    valS.onmousedown = (e) => {
      const r = valS.getBoundingClientRect();
      cV = 1 - (e.clientY - r.top) / 110;
      update();
    };
    p.querySelector("#close-p").onclick = () => (p.style.display = "none");
    p.querySelector("#save-p").onclick = () => (p.style.display = "none");
    return p;
  };

  let colorPicker;

  return {
    group,
    init: (username, innerHex, bhHex, onSave) => {
      uAngle = 0;
      ihAngle = 0;
      animState.uiOpacity = 0;
      animState.orbitFactor = 1.0;

      bhGroup = createSphere(LONE_CONFIG.bhSize, bhHex, "big horse");
      bhGroup.userData.inner.material.color.set(bhHex);
      group.add(bhGroup);

      if (username) {
        uGroup = createSphere(LONE_CONFIG.uSize, 0xffffff, username);

        // --- NEW TEXTURE LOGIC: SPRITE WITH HIGH RENDER ORDER ---
        const sigMat = new THREE.SpriteMaterial({
          transparent: true,
          opacity: 0,
          depthTest: false,
          alphaTest: 0.01, // Very low test to ensure faint lines show up
        });
        const sigSprite = new THREE.Sprite(sigMat);
        sigSprite.scale.setScalar(2.2);
        sigSprite.renderOrder = 1000;
        uGroup.add(sigSprite);
        uGroup.userData.sigSprite = sigSprite;
        group.add(uGroup);

        ihGroup = createSphere(
          LONE_CONFIG.ihSize,
          innerHex,
          getNearestColorName(innerHex),
          true,
        );
        colorPicker = createAeroPicker(innerHex || "#ffffff", (hex) => {
          this.setInnerColor(hex);
          if (onSave) onSave(hex);
        });
        ihGroup.userData.label.element.appendChild(colorPicker);
        group.add(ihGroup);

        // --- STRICT TWO-LINE SYSTEM ---
        const lineMat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthTest: false,
        });

        line1 = new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(6), 3),
          ),
          lineMat.clone(),
        );
        const c1 = new Float32Array(6);
        new THREE.Color(bhHex).toArray(c1, 0);
        new THREE.Color(0xffffff).toArray(c1, 3);
        line1.geometry.setAttribute("color", new THREE.BufferAttribute(c1, 3));

        line2 = new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(6), 3),
          ),
          lineMat.clone(),
        );
        const c2 = new Float32Array(6);
        new THREE.Color(0xffffff).toArray(c2, 0);
        new THREE.Color(innerHex).toArray(c2, 3);
        line2.geometry.setAttribute("color", new THREE.BufferAttribute(c2, 3));

        group.add(line1, line2);
      }
    },

    update: (delta, camera) => {
      if (!bhGroup || !uGroup || !ihGroup) return;
      const d = camera.position.distanceTo(bhGroup.position),
        zF = d / LONE_CONFIG.defaultZoom;
      const rZ = Math.max(
        0.1,
        1.0 + (zF - 1.0) * LONE_CONFIG.shrinkFactorRadii,
      );

      uAngle += LONE_CONFIG.userOrbitSpeed * delta * animState.orbitFactor;
      ihAngle += LONE_CONFIG.innerOrbitSpeed * delta * animState.orbitFactor;

      uGroup.position.set(
        Math.cos(uAngle) * LONE_CONFIG.userOrbitRadius * rZ,
        Math.sin(uAngle) * LONE_CONFIG.userOrbitRadius * rZ,
        0,
      );
      ihGroup.position.set(
        uGroup.position.x +
          Math.cos(ihAngle) * LONE_CONFIG.innerOrbitRadius * rZ,
        uGroup.position.y +
          Math.sin(ihAngle) * LONE_CONFIG.innerOrbitRadius * rZ,
        0,
      );

      if (line1 && line2) {
        const d1 = new THREE.Vector3()
          .subVectors(uGroup.position, bhGroup.position)
          .normalize();
        const p1 = line1.geometry.attributes.position.array;
        new THREE.Vector3()
          .copy(bhGroup.position)
          .addScaledVector(d1, LONE_CONFIG.bhSize + LONE_CONFIG.lineGap)
          .toArray(p1, 0);
        new THREE.Vector3()
          .copy(uGroup.position)
          .addScaledVector(d1, -(LONE_CONFIG.uSize + LONE_CONFIG.lineGap))
          .toArray(p1, 3);
        line1.geometry.attributes.position.needsUpdate = true;
        line1.material.opacity = animState.uiOpacity;

        const d2 = new THREE.Vector3()
          .subVectors(ihGroup.position, uGroup.position)
          .normalize();
        const p2 = line2.geometry.attributes.position.array;
        new THREE.Vector3()
          .copy(uGroup.position)
          .addScaledVector(d2, LONE_CONFIG.uSize + LONE_CONFIG.lineGap)
          .toArray(p2, 0);
        new THREE.Vector3()
          .copy(ihGroup.position)
          .addScaledVector(d2, -(LONE_CONFIG.ihSize + LONE_CONFIG.lineGap))
          .toArray(p2, 3);
        line2.geometry.attributes.position.needsUpdate = true;
        line2.material.opacity = animState.uiOpacity;
      }

      if (uGroup.userData.sigSprite)
        uGroup.userData.sigSprite.material.opacity = animState.uiOpacity;

      const cR = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      bhGroup.userData.label.position
        .copy(bhGroup.position)
        .addScaledVector(cR, LONE_CONFIG.gapBigHorse);
      uGroup.userData.label.position
        .copy(uGroup.position)
        .addScaledVector(cR, LONE_CONFIG.gapUser);
      ihGroup.userData.label.position
        .copy(ihGroup.position)
        .addScaledVector(cR, LONE_CONFIG.gapInner);
    },

    setInnerColor: (hex) => {
      const c = new THREE.Color(hex);
      ihGroup.userData.inner.material.color.copy(c);
      ihGroup.userData.nameLine.innerText = getNearestColorName(hex);
      ihGroup.userData.nameLine.style.color = hex;
      if (line2) {
        const colArr = line2.geometry.attributes.color.array;
        c.toArray(colArr, 3);
        line2.geometry.attributes.color.needsUpdate = true;
      }
    },

    applySignatureTexture: (url) => {
      if (!uGroup.userData.sigSprite) return;
      // USING IMAGE OBJECT TO ENSURE LOADING BEFORE TEXTURE CREATION
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.needsUpdate = true;
        uGroup.userData.sigSprite.material.map = tex;
        uGroup.userData.sigSprite.material.needsUpdate = true;
      };
      img.src = url;
    },

    checkIntersections: (r) => ({
      bigHorse: r.intersectObject(bhGroup, true).length > 0,
      innerHorse: r.intersectObject(ihGroup, true).length > 0,
      userHorse: r.intersectObject(uGroup, true).length > 0,
    }),

    triggerFraming: () =>
      gsap.to(animState, {
        orbitFactor: 0,
        uiOpacity: 0.8,
        duration: 1.5,
        ease: "power2.inOut",
      }),
    resetFraming: () =>
      gsap.to(animState, {
        orbitFactor: 1,
        uiOpacity: 0,
        duration: 1.5,
        ease: "power2.inOut",
      }),
    toggleColorPicker: () =>
      (colorPicker.style.display =
        colorPicker.style.display === "none" ? "flex" : "none"),
    dispose: () => {
      while (group.children.length > 0) group.remove(group.children[0]);
    },
  };
}
