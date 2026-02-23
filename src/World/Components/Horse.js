import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { getNearestColorName } from "../Utils/ColorUtils.js";

export async function createHorse() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );
  loader.setDRACOLoader(dracoLoader);

  const horseData = await loader.loadAsync("/assets/horse.glb");
  const model = horseData.scene;
  const horseGroup = new THREE.Group();
  horseGroup.add(model);
  model.position.set(0.0, -1.0, 0.1);

  const availableBones = [];
  const activeSpheres = [];
  const baseSphereSize = 0.005;
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);

  const getRandomPastel = () => {
    return new THREE.Color().setHSL(Math.random(), 0.4, 0.7).getHex();
  };

  const createGlowTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  };
  const glowTexture = createGlowTexture();

  model.traverse((child) => {
    if (child.isMesh) child.visible = false;
    if (child.isBone && !child.name.toLowerCase().includes("mane"))
      availableBones.push(child);
  });

  const createLabel = (text, hexColor = null) => {
    const div = document.createElement("div");
    div.className = "sphere-label";

    const nameLine = document.createElement("div");
    nameLine.innerText = text === "big horse" ? text : `the horse: ${text}`;
    div.appendChild(nameLine);

    if (text !== "big horse" && hexColor) {
      const colorLine = document.createElement("div");
      colorLine.className = "inner-horse-label";
      colorLine.innerText = `inner horse: ${getNearestColorName(hexColor)}`;
      colorLine.style.cssText = `font-size: 0.8em; opacity: 0.7; margin-top: 2px;`;
      div.appendChild(colorLine);
    }

    const label = new CSS2DObject(div);
    label.center.set(0, 0.5);
    horseGroup.add(label);
    return label;
  };

  const createSphereWithGlow = (geometry, scale, initialColor) => {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const inner = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: initialColor || 0xffffff,
        depthTest: false,
      }),
    );
    inner.scale.setScalar(0.6);
    inner.renderOrder = 999;
    inner.visible = false;
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.setScalar(4.0);
    group.add(core, inner, glow);
    group.scale.setScalar(scale);
    group.userData = { core, inner, glow, color: initialColor || 0xffffff };
    return group;
  };

  const addUserSphere = (username = "horse", existingColor = null) => {
    if (activeSpheres.find((s) => s.username === username)) return;
    const color =
      existingColor || `#${new THREE.Color(getRandomPastel()).getHexString()}`;
    const sphereGroup = createSphereWithGlow(
      sphereGeometry,
      baseSphereSize,
      color,
    );
    const bone =
      availableBones[Math.floor(Math.random() * availableBones.length)];
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
    );
    horseGroup.add(sphereGroup);
    activeSpheres.push({
      username,
      mesh: sphereGroup,
      bone,
      offset,
      label: createLabel(username, color),
    });
  };

  const updateUserColor = (username, newColor) => {
    const sphere = activeSpheres.find((s) => s.username === username);
    if (sphere) {
      sphere.mesh.userData.color = newColor;
      sphere.mesh.userData.inner.material.color.set(newColor);
      const labels = sphere.label.element.querySelectorAll("div");
      if (labels.length > 1) {
        labels[1].innerText = `inner horse: ${getNearestColorName(newColor)}`;
      }
    }
  };

  const getBigHorseThemeColor = () => {
    const style = getComputedStyle(document.documentElement);
    return new THREE.Color(
      style.getPropertyValue("--big-horse-color").trim() || "#ffeab5",
    );
  };

  const chestBone =
    availableBones.find((b) => b.name === "DEF-chest_082") || availableBones[0];
  const leaderColor = getBigHorseThemeColor();
  const leaderSphere = createSphereWithGlow(
    sphereGeometry,
    baseSphereSize * 4,
    leaderColor,
  );
  leaderSphere.userData.core.material.color.copy(leaderColor);
  horseGroup.add(leaderSphere);
  activeSpheres.push({
    username: "big horse",
    mesh: leaderSphere,
    bone: chestBone,
    offset: new THREE.Vector3(),
    label: createLabel("big horse"),
  });

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(
    horseData.animations[1] || horseData.animations[0],
  );
  action.play();

  return {
    horseGroup,
    addUserSphere,
    updateUserColor,
    activeSpheres,
    update: (delta, camera) => {
      mixer.update(delta);
      const leader = activeSpheres.find((s) => s.username === "big horse");
      if (leader) {
        const themeColor = getBigHorseThemeColor();
        leader.mesh.userData.core.material.color.copy(themeColor);
        leader.mesh.userData.inner.material.color.copy(themeColor);
      }
      const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
        camera.quaternion,
      );
      const worldPos = new THREE.Vector3();
      activeSpheres.forEach((s) => {
        s.bone.getWorldPosition(worldPos);
        s.mesh.position.copy(worldPos).add(s.offset);
        if (s.label) {
          const gap = s.mesh.scale.x + 0.005;
          s.label.position
            .copy(s.mesh.position)
            .addScaledVector(cameraRight, gap);
        }
      });
    },
  };
}
