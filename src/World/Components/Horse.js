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
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  model.traverse((child) => {
    if (child.isMesh) child.visible = false;
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
    // add to horseGroup instead of the sphere mesh to avoid rotation inheritance
    horseGroup.add(label);
    return label;
  };

  const chestBone =
    availableBones.find((b) => b.name === "DEF-chest_082") || availableBones[0];
  const leaderSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  leaderSphere.scale.setScalar(baseSphereSize * 4);
  leaderSphere.userData = { username: "big horse" };
  horseGroup.add(leaderSphere);

  activeSpheres.push({
    mesh: leaderSphere,
    bone: chestBone,
    offset: new THREE.Vector3(),
    label: createLabel("big horse"),
  });

  const addUserSphere = (username = "horse") => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.scale.setScalar(baseSphereSize);
    sphere.userData = { username: username };
    const bone =
      availableBones[Math.floor(Math.random() * availableBones.length)];
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
    );
    horseGroup.add(sphere);
    activeSpheres.push({
      mesh: sphere,
      bone: bone,
      offset: offset,
      label: createLabel(username),
    });
  };

  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(horseData.animations[1] || horseData.animations[0]).play();

  // temp variables for math to avoid garbage collection
  const worldPos = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();

  return {
    horseGroup,
    addUserSphere,
    activeSpheres,
    mixer,
    update: (delta, camera) => {
      mixer.update(delta);

      // get the camera's "right" direction in world space
      if (camera) {
        cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      }

      activeSpheres.forEach((s) => {
        s.bone.getWorldPosition(worldPos);
        s.mesh.position.copy(worldPos).add(s.offset);

        // update label position to be at the sphere + an offset to the right of the camera
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
