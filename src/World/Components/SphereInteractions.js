import * as THREE from "three";
import gsap from "gsap";

export function createSphereInteractions(
  camera,
  controls,
  conn,
  horseDataRefGetter,
) {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Mesh.threshold = 0.06;
  raycaster.params.Line.threshold = 0.01;
  const mouse = new THREE.Vector2();

  let hoveredGroup = null;
  let isPaused = false;
  let mouseDownPos = { x: 0, y: 0 };
  const clickThreshold = 5;

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const horseData = horseDataRefGetter();
    if (!horseData) return;

    raycaster.setFromCamera(mouse, camera);
    const targets = [];
    horseData.activeSpheres.forEach((s) => {
      if (s.mesh.visible) {
        s.mesh.traverse((child) => {
          if (child.isMesh && child.type !== "Sprite") targets.push(child);
        });
      }
    });

    if (conn.lineMaterial.opacity > 0)
      conn.lineGroup.children.forEach((l) => targets.push(l));

    const intersects = raycaster.intersectObjects(targets);
    const isOverLine = conn.handleLineInteraction(intersects, mouse);
    const sphereHit = intersects.find((hit) => hit.object.type === "Mesh");

    if (sphereHit) {
      const group = sphereHit.object.parent;
      if (hoveredGroup !== group && group.userData.glow) {
        if (hoveredGroup)
          gsap.to(hoveredGroup.userData.glow.material, {
            opacity: 0,
            duration: 0.3,
          });
        hoveredGroup = group;
        document.body.style.cursor = "pointer";
        gsap.to(hoveredGroup.userData.glow.material, {
          opacity: 0.6,
          duration: 0.3,
        });
      }
    } else {
      if (hoveredGroup) {
        gsap.to(hoveredGroup.userData.glow.material, {
          opacity: 0,
          duration: 0.3,
        });
        hoveredGroup = null;
      }
      if (!isOverLine) document.body.style.cursor = "default";
    }
  });

  window.addEventListener("mousedown", (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", (event) => {
    if (
      event.target.closest("#ui-container") ||
      event.target.id === "theme-cycle-dot" ||
      event.target.id === "manifesto-icon" ||
      event.target.id === "inner-horse-dot"
    )
      return;

    const deltaX = Math.abs(event.clientX - mouseDownPos.x);
    const deltaY = Math.abs(event.clientY - mouseDownPos.y);
    if (deltaX > clickThreshold || deltaY > clickThreshold) return;

    const horseData = horseDataRefGetter();
    if (!horseData) return;

    raycaster.setFromCamera(mouse, camera);
    const targets = [];
    horseData.activeSpheres.forEach((s) => {
      if (s.mesh.visible) {
        s.mesh.traverse((child) => {
          if (child.isMesh && child.type !== "Sprite") targets.push(child);
        });
      }
    });

    if (conn.lineMaterial.opacity > 0)
      conn.lineGroup.children.forEach((l) => targets.push(l));

    const intersects = raycaster.intersectObjects(targets);
    conn.handleLineInteraction(intersects, mouse);
    const sphereHit = intersects.find((hit) => hit.object.type === "Mesh");

    if (sphereHit) {
      isPaused = true;
      gsap.to(conn.lineMaterial, { opacity: 0.4, duration: 1 });
      const targetObj = sphereHit.object;
      const targetPos = new THREE.Vector3();
      targetObj.getWorldPosition(targetPos);
      const zoomFactor = targetObj.parent.scale.x * 12;

      const tl = gsap.timeline();
      tl.to(
        controls.target,
        {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
          duration: 1.2,
          ease: "power3.inOut",
        },
        0,
      );

      const camDir = new THREE.Vector3()
        .subVectors(camera.position, targetPos)
        .normalize();
      const finalCamPos = targetPos
        .clone()
        .add(camDir.multiplyScalar(zoomFactor));

      tl.to(
        camera.position,
        {
          x: finalCamPos.x,
          y: finalCamPos.y,
          z: finalCamPos.z,
          duration: 1.2,
          ease: "power3.inOut",
          onUpdate: () => camera.lookAt(targetPos),
        },
        0,
      );
    } else if (!intersects.find((hit) => hit.object.type === "Line")) {
      isPaused = false;
      gsap.to(conn.lineMaterial, { opacity: 0, duration: 0.5 });
      conn.lineLabelDiv.style.opacity = "0";
      if (conn.hideInnerHorses) conn.hideInnerHorses(horseData);

      const tl = gsap.timeline();
      tl.to(
        controls.target,
        { x: 0, y: 0, z: 0, duration: 1.2, ease: "power3.inOut" },
        0,
      );
      tl.to(
        camera.position,
        { x: 0, y: 0, z: 2.5, duration: 1.2, ease: "power3.inOut" },
        0,
      );
    }
  });

  return {
    getIsPaused: () => isPaused,
    setIsPaused: (val) => {
      isPaused = val;
    },
  };
}
