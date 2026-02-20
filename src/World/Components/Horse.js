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
    if (child.isBone) {
      const name = child.name.toLowerCase();
      if (!name.includes("mane") && !name.includes("shoulder")) {
        availableBones.push(child);
      }
    }
  });

  const chestBone = availableBones.find((b) => b.name === "DEF-chest_082");
  if (chestBone) {
    const leaderSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    leaderSphere.scale.setScalar(baseSphereSize * 4);
    leaderSphere.userData = { username: "big horse" };
    horseGroup.add(leaderSphere);
    activeSpheres.push({
      mesh: leaderSphere,
      bone: chestBone,
      offset: new THREE.Vector3(),
    });
  }

  const addUserSphere = (username = "horse") => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.scale.setScalar(baseSphereSize);
    sphere.userData = { username: username };

    const occupiedBones = activeSpheres.map((s) => s.bone);
    const emptyBones = availableBones.filter((b) => !occupiedBones.includes(b));

    let targetBone;
    let offset = new THREE.Vector3();

    if (emptyBones.length > 0) {
      targetBone = emptyBones[Math.floor(Math.random() * emptyBones.length)];
    } else {
      targetBone =
        availableBones[Math.floor(Math.random() * availableBones.length)];
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
    addUserSphere,
    activeSpheres, // This is the live array main.js will use
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
