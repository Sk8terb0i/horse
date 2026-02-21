import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

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

  // create a soft radial gradient texture for the glow
  const createGlowTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  const glowTexture = createGlowTexture();

  model.traverse((child) => {
    if (child.isMesh) {
      child.visible = false;
    }
    if (child.isBone && !child.name.toLowerCase().includes("mane")) {
      availableBones.push(child);
    }
  });

  const createLabel = (text) => {
    const div = document.createElement("div");
    div.className = "sphere-label";
    div.innerText = text === "big horse" ? text : `the horse: ${text}`;
    const label = new CSS2DObject(div);
    label.center.set(0, 0.5);
    horseGroup.add(label);
    return label;
  };

  const createSphereWithGlow = (geometry, scale) => {
    const group = new THREE.Group();

    // the core sphere (unlit)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(geometry, coreMat);

    // the soft glow sprite
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(4.0);

    group.add(core, glow);
    group.scale.setScalar(scale);
    group.userData = { core, glow };

    return group;
  };

  const chestBone =
    availableBones.find((b) => b.name === "DEF-chest_082") || availableBones[0];
  const leaderSphereGroup = createSphereWithGlow(
    sphereGeometry,
    baseSphereSize * 4,
  );
  horseGroup.add(leaderSphereGroup);
  activeSpheres.push({
    mesh: leaderSphereGroup,
    bone: chestBone,
    offset: new THREE.Vector3(),
    label: createLabel("big horse"),
  });

  const addUserSphere = (username = "horse") => {
    const sphereGroup = createSphereWithGlow(sphereGeometry, baseSphereSize);
    const bone =
      availableBones[Math.floor(Math.random() * availableBones.length)];
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
    );
    horseGroup.add(sphereGroup);
    activeSpheres.push({
      mesh: sphereGroup,
      bone: bone,
      offset: offset,
      label: createLabel(username),
    });
  };

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(
    horseData.animations[1] || horseData.animations[0],
  );
  action.play();

  const worldPos = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();

  return {
    horseGroup,
    addUserSphere,
    activeSpheres,
    mixer,
    update: (delta, camera) => {
      mixer.update(delta);

      if (camera) {
        cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      }

      activeSpheres.forEach((s) => {
        s.bone.getWorldPosition(worldPos);
        s.mesh.position.copy(worldPos).add(s.offset);

        if (s.label && camera) {
          const gap = s.mesh.scale.x + 0.005;
          s.label.position
            .copy(s.mesh.position)
            .addScaledVector(cameraRight, gap);
        }
      });
    },
  };
}
