import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export async function createHorse() {
  const loader = new GLTFLoader();

  // 1. Set up the Draco loader
  const dracoLoader = new DRACOLoader();

  // 2. Point to the decoder (This path works for most Vite/Node setups)
  // These files are usually served from a CDN for ease of use
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
  );

  // 3. Tell the GLTFLoader to use it
  loader.setDRACOLoader(dracoLoader);

  const horseData = await loader.loadAsync("/assets/horse.glb");
  // ... rest of your code remains exactly the same ...
  const model = horseData.scene;
  const horseGroup = new THREE.Group();
  horseGroup.add(model);

  model.position.set(0.0, -1.0, 0.1);

  // 1. Storage for tracking
  const availableBones = [];
  const activeSpheres = []; // Stores { mesh, bone }

  const baseSphereSize = 0.005;
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 12); // Radius 1, we scale it later
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 2. Initial Setup: Identify valid bones and hide mesh
  model.traverse((child) => {
    if (child.isMesh) child.visible = false;
    if (child.isBone) {
      const name = child.name.toLowerCase();
      if (!name.includes("mane") && !name.includes("shoulder")) {
        availableBones.push(child);
      }
    }
  });

  // 3. Create the "Chest Leader" Sphere
  const chestBone = availableBones.find((b) => b.name === "DEF-chest_082");
  if (chestBone) {
    const leaderSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    leaderSphere.scale.setScalar(baseSphereSize * 4); // Twice the size
    horseGroup.add(leaderSphere);
    activeSpheres.push({
      mesh: leaderSphere,
      bone: chestBone,
      offset: new THREE.Vector3(),
    });
  }

  // 4. Function to add a new user sphere
  const addUserSphere = () => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.scale.setScalar(baseSphereSize);

    // Logic: Find a bone that doesn't have a sphere yet
    const occupiedBones = activeSpheres.map((s) => s.bone);
    const emptyBones = availableBones.filter((b) => !occupiedBones.includes(b));

    let targetBone;
    let offset = new THREE.Vector3();

    if (emptyBones.length > 0) {
      // Pick a random empty bone
      targetBone = emptyBones[Math.floor(Math.random() * emptyBones.length)];
    } else {
      // All bones filled, cluster around a random bone
      targetBone =
        availableBones[Math.floor(Math.random() * availableBones.length)];
      // Randomly offset the position slightly for the "clustering" effect
      offset.set(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
      );
    }

    horseGroup.add(sphere);
    activeSpheres.push({ mesh: sphere, bone: targetBone, offset: offset });
  };

  const mixer = new THREE.AnimationMixer(model);
  if (horseData.animations.length > 1)
    mixer.clipAction(horseData.animations[1]).play();

  const worldPos = new THREE.Vector3();

  return {
    horseGroup,
    addUserSphere, // Export this so main.js can call it
    update: (delta) => {
      mixer.update(delta);
      activeSpheres.forEach((s) => {
        s.bone.getWorldPosition(worldPos);
        s.mesh.position.copy(worldPos).add(s.offset);
      });
    },
  };
}
