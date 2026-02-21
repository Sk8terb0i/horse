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

  const createLabel = (mesh, text) => {
    const div = document.createElement("div");
    div.className = "sphere-label";
    div.innerText = text === "big horse" ? text : `the horse: ${text}`;

    const label = new CSS2DObject(div);

    // logic: anchor the LEFT edge of the label to the point
    label.center.set(0, 0.5);

    // because the label is a child of the mesh, its position is relative
    // to the mesh's scale. since our geometry radius is 1:
    // 1.0 = exactly on the sphere's surface
    // 1.1 = slightly outside the surface (regardless of if the sphere is big or small)
    label.position.set(1.1, 0, 0);

    mesh.add(label);
    return label;
  };

  // --- create big horse ---
  const chestBone =
    availableBones.find((b) => b.name === "DEF-chest_082") || availableBones[0];
  const leaderSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  leaderSphere.scale.setScalar(baseSphereSize * 4);
  leaderSphere.userData = { username: "big horse" };
  horseGroup.add(leaderSphere);

  // now uses the normalized 1.1 offset relative to its larger scale
  const leaderLabel = createLabel(leaderSphere, "big horse");

  activeSpheres.push({
    mesh: leaderSphere,
    bone: chestBone,
    offset: new THREE.Vector3(),
    label: leaderLabel,
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
    const label = createLabel(sphere, username);
    activeSpheres.push({
      mesh: sphere,
      bone: bone,
      offset: offset,
      label: label,
    });
  };

  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(horseData.animations[1] || horseData.animations[0]).play();

  const worldPos = new THREE.Vector3();
  return {
    horseGroup,
    addUserSphere,
    activeSpheres,
    mixer,
    update: (delta) => {
      mixer.update(delta);
      activeSpheres.forEach((s) => {
        s.bone.getWorldPosition(worldPos);
        s.mesh.position.copy(worldPos).add(s.offset);
      });
    },
  };
}
