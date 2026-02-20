import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

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

  // Create Big Horse
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
    activeSpheres.push({ mesh: sphere, bone: bone, offset: offset });
  };

  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(horseData.animations[1] || horseData.animations[0]).play();

  const worldPos = new THREE.Vector3();
  return {
    horseGroup,
    addUserSphere,
    activeSpheres,
    leaderSphere, // Targeted interaction
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
