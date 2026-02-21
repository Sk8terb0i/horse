import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export function createConnections(scene) {
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  const lineMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 0.01,
    gapSize: 0.01,
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
  lineLabelDiv.style.whiteSpace = "nowrap";

  const lineLabel = new CSS2DObject(lineLabelDiv);
  scene.add(lineLabel);

  const updateConnections = (horseDataRef) => {
    lineGroup.clear();
    if (!horseDataRef) return;

    const spheres = horseDataRef.activeSpheres;
    const spherePositions = spheres.map((s) => {
      const pos = new THREE.Vector3();
      s.mesh.getWorldPosition(pos);
      return pos;
    });

    for (let i = 0; i < spherePositions.length; i++) {
      const posA = spherePositions[i];
      const distances = [];
      for (let j = 0; j < spherePositions.length; j++) {
        if (i === j) continue;
        distances.push({
          pos: spherePositions[j],
          dist: posA.distanceTo(spherePositions[j]),
        });
      }
      distances.sort((a, b) => a.dist - b.dist);

      for (let n = 0; n < Math.min(3, distances.length); n++) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          posA,
          distances[n].pos,
        ]);
        const line = new THREE.Line(geometry, lineMaterial);
        line.userData = { start: posA.clone(), end: distances[n].pos.clone() };
        line.computeLineDistances();
        lineGroup.add(line);
      }
    }
  };

  const handleLineInteraction = (intersects, mousePos) => {
    const lineIntersect = intersects.find((hit) => hit.object.type === "Line");

    if (lineIntersect) {
      document.body.style.cursor = "pointer";

      // position label relative to the hit point in 3d space
      lineLabel.position.copy(lineIntersect.point);

      // apply a css offset to move it to the right of the cursor/press
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
  };
}
