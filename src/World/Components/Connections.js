import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export function createConnections(scene) {
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  // use linebasicmaterial to support vertex colors (dashed doesn't support gradients well)
  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const lineLabelDiv = document.createElement("div");
  lineLabelDiv.className = "sphere-label";
  lineLabelDiv.innerText = "horse";
  lineLabelDiv.style.opacity = "0";
  lineLabelDiv.style.position = "absolute";
  lineLabelDiv.style.pointerEvents = "none";
  const lineLabel = new CSS2DObject(lineLabelDiv);
  scene.add(lineLabel);

  const updateConnections = (horseDataRef) => {
    lineGroup.clear();
    if (!horseDataRef) return;

    const spheres = horseDataRef.activeSpheres;
    // ensure inner horses are visible when connections are active
    spheres.forEach((s) => (s.mesh.userData.inner.visible = true));

    for (let i = 0; i < spheres.length; i++) {
      const sA = spheres[i];
      const posA = new THREE.Vector3();
      sA.mesh.getWorldPosition(posA);

      const distances = spheres
        .filter((_, idx) => idx !== i)
        .map((sB) => {
          const posB = new THREE.Vector3();
          sB.mesh.getWorldPosition(posB);
          return { sB, pos: posB, dist: posA.distanceTo(posB) };
        })
        .sort((a, b) => a.dist - b.dist);

      for (let n = 0; n < Math.min(3, distances.length); n++) {
        const sB = distances[n].sB;
        const posB = distances[n].pos;
        const mid = new THREE.Vector3()
          .addVectors(posA, posB)
          .multiplyScalar(0.5);

        const geometry = new THREE.BufferGeometry().setFromPoints([
          posA,
          mid,
          posB,
        ]);

        // assign colors: half one color, half the other
        const colorA = new THREE.Color(sA.mesh.userData.color);
        const colorB = new THREE.Color(sB.mesh.userData.color);
        const colors = new Float32Array([
          colorA.r,
          colorA.g,
          colorA.b,
          colorA.r,
          colorA.g,
          colorA.b, // mid takes colorA or B for sharp split, or blend for gradient
          colorB.r,
          colorB.g,
          colorB.b,
        ]);
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const line = new THREE.Line(geometry, lineMaterial);
        line.userData = { start: posA.clone(), end: posB.clone() };
        lineGroup.add(line);
      }
    }
  };

  // hide inner horses when reset
  const hideInnerHorses = (horseDataRef) => {
    if (horseDataRef)
      horseDataRef.activeSpheres.forEach(
        (s) => (s.mesh.userData.inner.visible = false),
      );
  };

  const handleLineInteraction = (intersects, mousePos) => {
    const lineIntersect = intersects.find((hit) => hit.object.type === "Line");
    if (lineIntersect) {
      document.body.style.cursor = "pointer";
      lineLabel.position.copy(lineIntersect.point);
      lineLabelDiv.style.transform = "translate(20px, -50%)";
      lineLabelDiv.style.opacity = "1";
      return true;
    } else {
      lineLabelDiv.style.opacity = "0";
      return false;
    }
  };

  return {
    lineGroup,
    lineMaterial,
    lineLabel,
    lineLabelDiv,
    updateConnections,
    handleLineInteraction,
    hideInnerHorses,
  };
}
