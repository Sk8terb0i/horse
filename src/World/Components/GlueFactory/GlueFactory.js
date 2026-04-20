import { RitualStyles } from "./RitualStyles.js";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const CATEGORY_Z_INDEX = {
  leg_b_back: 1,
  leg_f_back: 2,
  torso: 3,
  head: 4,
  leg_b_front: 5,
  leg_f_front: 6,
  outfit: 10,
  bottle: 1,
  label: 5,
  letter: 8,
  decoration: 10,
};

const POT_COORDS = {
  back: { left: "711.333px", top: "487.323px" },
  liquid: { left: "711.333px", top: "495.323px" },
  front: { left: "501px", top: "702px" },
};

const RECLAMATION_PHRASES = [
  "The essence is reclaimed.",
  "Binding the form into function.",
  "The memory of the gait remains.",
  "From hooves to adhesive strength.",
  "Spirit preserved in the simmer.",
  "The vessel dissolves, the purpose endures.",
  "Extracting the binding spirit.",
  "The transformation is absolute.",
];

// --- DYNAMIC ASSET CATALOG FOR PUBLIC FOLDER ---
const ASSET_PATH = import.meta.env.BASE_URL + "GlueFactoryAssets/";

const PART_CATALOG = {
  torso: [],
  head: [],
  leg_f_front: [],
  leg_f_back: [],
  leg_b_front: [],
  leg_b_back: [],
  outfit: [],
};

const BOTTLE_CATALOG = {
  bottle: [],
  label: [],
  decoration: [],
  letter: [],
};

let isCatalogLoaded = false;

// Dynamically checks images sequentially until it hits a 404
async function buildCatalog() {
  if (isCatalogLoaded) return;

  const checkImage = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

  // Added a 'type' parameter to switch between number and letter checking
  const probe = async (map, key, prefix, type = "number") => {
    if (type === "number") {
      let i = 1;
      while (true) {
        const file = `${prefix}_${i}.png`;
        const exists = await checkImage(ASSET_PATH + file);
        if (exists) {
          map[key].push(file);
          if (key === "leg_f_front") map["leg_f_back"].push(file);
          if (key === "leg_b_front") map["leg_b_back"].push(file);
          i++;
        } else break;
      }
    } else if (type === "letter") {
      // Check for letters a through z
      const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
      for (const char of alphabet) {
        const file = `${prefix}_${char}.png`;
        const exists = await checkImage(ASSET_PATH + file);
        if (exists) {
          map[key].push(file);
        }
      }
    }
  };

  await Promise.all([
    probe(PART_CATALOG, "torso", "torso"),
    probe(PART_CATALOG, "head", "head"),
    probe(PART_CATALOG, "leg_f_front", "leg_f"),
    probe(PART_CATALOG, "leg_b_front", "leg_b"),
    probe(PART_CATALOG, "outfit", "outfit"),
    probe(BOTTLE_CATALOG, "bottle", "bottle"),
    probe(BOTTLE_CATALOG, "label", "label"),
    probe(BOTTLE_CATALOG, "decoration", "decoration"),
    // Notice the specific "letter" flag here:
    probe(BOTTLE_CATALOG, "letter", "letter", "letter"),
  ]);

  isCatalogLoaded = true;
}

function showDialog(container, message) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="win95-dialog">
      <div class="win95-title"><span>System Message</span></div>
      <div style="padding: 20px; text-align: center;">
        <p style="font-size: 12px; margin-bottom: 15px; color: #000;">${message}</p>
        <button class="btn-95 dialog-close" style="width: 60px;">OK</button>
      </div>
    </div>`;
  container.appendChild(overlay);
  overlay.querySelector(".dialog-close").onclick = () => overlay.remove();
}

function injectXPTaskbar(container) {
  if (document.getElementById("xp-taskbar")) return;
  const taskbar = document.createElement("div");
  taskbar.id = "xp-taskbar";
  taskbar.style.cssText = `
    position: fixed; bottom: 0; left: 0; width: 100%; height: 30px;
    background: linear-gradient(to bottom, #245edb 0%, #3f8cf3 9%, #245edb 18%, #245edb 92%, #333 100%);
    z-index: 9999; display: flex; align-items: center; box-shadow: inset 0 1px #77a5f8;
  `;

  const startBtn = document.createElement("div");
  startBtn.style.cssText = `
    height: 100%; padding: 0 15px; display: flex; align-items: center;
    background: linear-gradient(to bottom, #388e3c 0%, #4caf50 10%, #388e3c 90%, #1b5e20 100%);
    border-radius: 0 10px 10px 0; cursor: pointer; color: white;
    font-family: 'Tahoma', sans-serif; font-weight: bold; font-style: italic;
    font-size: 14px; text-shadow: 1px 1px 1px #222; box-shadow: 2px 0 5px rgba(0,0,0,0.3);
    user-select: none; transition: filter 0.1s;
  `;
  startBtn.innerText = "Home";

  // XP Button Hover & Click effects
  startBtn.onmouseenter = () => (startBtn.style.filter = "brightness(1.2)");
  startBtn.onmouseleave = () => (startBtn.style.filter = "brightness(1.0)");
  startBtn.onmousedown = () => (startBtn.style.filter = "brightness(0.7)");
  startBtn.onmouseup = () => (startBtn.style.filter = "brightness(1.2)");

  startBtn.onclick = () => (window.location.hash = "#");

  taskbar.appendChild(startBtn);
  container.appendChild(taskbar);
}

export async function initGlueFactory(container, db, username) {
  if (!document.getElementById("ritual-css")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "ritual-css";
    styleSheet.innerText = RitualStyles;
    document.head.appendChild(styleSheet);
  }

  // Await the dynamic image scanner before showing the room
  await buildCatalog();

  let manifestations = {},
    activeHorseName = "";

  try {
    const userDoc = await getDoc(doc(db, "users", username));
    if (userDoc.exists()) {
      const data = userDoc.data();
      manifestations = data.manifestations || {};
      activeHorseName = data.activeHorseName || "";

      if (activeHorseName && manifestations[activeHorseName]) {
        const horse = manifestations[activeHorseName];
        container.innerHTML = "";

        if (horse.isBottled) {
          container.innerHTML = `
                <div class="game-wrapper" style="display:flex; flex-direction:column; align-items:center; justify-content:center; background-image: url('${ASSET_PATH}bg_bottle_shelf.jpg'); background-size: cover; background-position: center;">
                    <div style="background: rgba(192, 192, 192, 0.9); padding: 20px; border: 2px outset #fff; text-align: center;">
                      <h1 style="color:#000; font-family:'MS Sans Serif'; font-size: 16px;">${horse.name || activeHorseName} is preserved.</h1>
                      <button id="btn-return-sanctuary" class="btn-95" style="margin-top: 15px; font-weight: bold;">Return to the herd</button>
                    </div>
                </div>`;
          injectXPTaskbar(container);
          document.getElementById("btn-return-sanctuary").onclick =
            async () => {
              await updateDoc(doc(db, "users", username), {
                activeHorseName: "",
              });
              window.location.hash = "#";
            };
          return;
        } else if (horse.isBoiled) {
          renderBottlePhase(
            container,
            activeHorseName,
            db,
            username,
            manifestations,
          );
          return;
        } else {
          renderDressUpPhase(
            container,
            db,
            username,
            manifestations,
            activeHorseName,
          );
          return;
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  container.innerHTML = "";
  renderDressUpPhase(container, db, username, manifestations, "");
}

async function isPixelTransparent(img, clientX, clientY) {
  if (img.naturalWidth === 0) return false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rect = img.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2,
    centerY = rect.top + rect.height / 2;
  const rotation = parseFloat(img.dataset.rotate || 0) * (Math.PI / 180);
  const cos = Math.cos(-rotation),
    sin = Math.sin(-rotation);
  const scale = parseFloat(img.dataset.scale || 0.7);
  const finalX =
    ((clientX - centerX) * cos - (clientY - centerY) * sin) / scale +
    img.naturalWidth / 2;
  const finalY =
    ((clientX - centerX) * sin + (clientY - centerY) * cos) / scale +
    img.naturalHeight / 2;
  canvas.width = 1;
  canvas.height = 1;
  ctx.drawImage(img, finalX, finalY, 1, 1, 0, 0, 1, 1);
  return ctx.getImageData(0, 0, 1, 1).data[3] < 10;
}

// --- BOTTLE DECORATION PHASE ---
function renderBottlePhase(container, horseID, db, username, manifestations) {
  let currentBottle = null;
  const horseData = manifestations[horseID] || {};
  const horseDisplayName = horseData.name || horseID;

  function updateSidebar() {
    const sidebar = container.querySelector(".catalog-sidebar");
    let html = `<div class="catalog-category"><h4>Essence: ${horseDisplayName}</h4></div>`;
    if (!currentBottle) {
      html += `<div class="catalog-category"><h4>1. Choose Vessel</h4><div style="display:flex; flex-wrap:wrap;">
        ${BOTTLE_CATALOG.bottle.map((f) => `<img src="${ASSET_PATH}${f}" class="catalog-item" draggable="true" data-file="${f}" data-category="bottle">`).join("")}
      </div></div>`;
    } else {
      ["label", "letter", "decoration"].forEach((cat) => {
        html += `<div class="catalog-category"><h4>${cat.charAt(0).toUpperCase() + cat.slice(1)}s</h4><div style="display:flex; flex-wrap:wrap;">
          ${BOTTLE_CATALOG[cat].map((f) => `<img src="${ASSET_PATH}${f}" class="catalog-item" draggable="true" data-file="${f}" data-category="${cat}">`).join("")}
        </div></div>`;
      });
    }
    sidebar.innerHTML = html;
    attachSidebarEvents();
  }

  container.innerHTML = `
    <div class="game-wrapper">
      <div class="win95-window-sidebar" id="main-sidebar">
        <div class="win95-title"><span>reclaim_the_glue.exe</span></div>
        <div class="catalog-sidebar"></div>
        <div style="padding: 4px; background: #c0c0c0; border-top: 2px outset #fff;">
          <button id="btn-save-bottle" class="btn-95" style="width:100%; font-weight:bold;">Seal & Save ${horseDisplayName}</button>
        </div>
      </div>
      <div class="viewport-area" id="game-viewport" style="background-image: url('${ASSET_PATH}bg_bottle_shelf.jpg'); cursor: default;">
        <div id="floating-tools" class="floating-tools" style="user-select: none;">
          <div class="group-stack">
            <div id="handle-forward" class="tool-handle">▲</div>
            <div id="handle-backward" class="tool-handle">▼</div>
          </div>
          <div id="handle-scale" class="tool-handle">⤡</div>
          <div id="handle-rotate" class="tool-handle">⟳</div>
          <div id="handle-delete" class="tool-handle">✖</div>
        </div>
      </div>
    </div>`;

  injectXPTaskbar(container);

  const viewport = document.getElementById("game-viewport"),
    floatingTools = document.getElementById("floating-tools");
  let activeEl = null,
    selectedEl = null,
    isDragging = false,
    isScaling = false,
    isRotating = false;
  let clickOffsetX = 0,
    clickOffsetY = 0,
    transformCenterX = 0,
    transformCenterY = 0,
    startDistance = 0,
    startScale = 1,
    initialMouseAngle = 0,
    startRotation = 0;

  function attachSidebarEvents() {
    container.querySelectorAll(".catalog-item").forEach((item) => {
      item.ondragstart = (e) => {
        e.dataTransfer.setData("file", e.target.dataset.file);
        e.dataTransfer.setData("category", e.target.dataset.category);
      };
    });
  }

  const applyTransform = (el) => {
    el.style.transform = `translate(-50%, -50%) scale(${el.dataset.scale}) rotate(${el.dataset.rotate}deg)`;
    const s = parseFloat(el.dataset.scale || "0.7");
    floatingTools.style.width = Math.max(80, el.offsetWidth * s) + "px";
    floatingTools.style.height = Math.max(80, el.offsetHeight * s) + "px";
    floatingTools.style.left = el.style.left;
    floatingTools.style.top = el.style.top;
    floatingTools.style.display = "block";
  };

  const spawnAsset = (file, cat, x, y) => {
    const img = document.createElement("img");
    img.className = "sprite-part draggable";
    img.dataset.file = file;
    img.dataset.category = cat;
    img.dataset.scale = "0.7";
    img.dataset.rotate = "0";
    img.style.zIndex = CATEGORY_Z_INDEX[cat] || 10;
    img.style.left = x;
    img.style.top = y;
    img.src = ASSET_PATH + file;
    img.crossOrigin = "anonymous";
    img.ondragstart = (e) => e.preventDefault();
    img.onload = () => {
      if (cat === "bottle") {
        if (currentBottle) currentBottle.remove();
        currentBottle = img;
        updateSidebar();
      }
      if (selectedEl) selectedEl.classList.remove("active-part");
      selectedEl = img;
      selectedEl.classList.add("active-part");
      applyTransform(img);
    };
    viewport.appendChild(img);
  };

  viewport.ondragover = (e) => e.preventDefault();
  viewport.ondrop = (e) => {
    e.preventDefault();
    const vp = viewport.getBoundingClientRect();
    spawnAsset(
      e.dataTransfer.getData("file"),
      e.dataTransfer.getData("category"),
      (((e.clientX - vp.left) / vp.width) * 100).toFixed(2) + "%",
      (((e.clientY - vp.top) / vp.height) * 100).toFixed(2) + "%",
    );
  };

  document.getElementById("handle-forward").onclick = (e) => {
    e.stopPropagation();
    if (selectedEl)
      selectedEl.style.zIndex = parseInt(selectedEl.style.zIndex) + 1;
  };
  document.getElementById("handle-backward").onclick = (e) => {
    e.stopPropagation();
    if (selectedEl)
      selectedEl.style.zIndex = Math.max(
        0,
        parseInt(selectedEl.style.zIndex) - 1,
      );
  };

  document.getElementById("handle-scale").onmousedown = (e) => {
    if (!selectedEl) return;
    e.stopPropagation();
    isScaling = true;
    startScale = parseFloat(selectedEl.dataset.scale);
    const rect = selectedEl.getBoundingClientRect();
    transformCenterX = rect.left + rect.width / 2;
    transformCenterY = rect.top + rect.height / 2;
    startDistance =
      Math.hypot(e.clientX - transformCenterX, e.clientY - transformCenterY) ||
      0.1;
    e.preventDefault();
  };
  document.getElementById("handle-rotate").onmousedown = (e) => {
    if (!selectedEl) return;
    e.stopPropagation();
    isRotating = true;
    startRotation = parseFloat(selectedEl.dataset.rotate);
    const rect = selectedEl.getBoundingClientRect();
    transformCenterX = rect.left + rect.width / 2;
    transformCenterY = rect.top + rect.height / 2;
    initialMouseAngle = Math.atan2(
      e.clientY - transformCenterY,
      e.clientX - transformCenterX,
    );
    e.preventDefault();
  };
  document.getElementById("handle-delete").onclick = () => {
    if (!selectedEl) return;
    if (selectedEl === currentBottle) {
      currentBottle = null;
      updateSidebar();
    }
    selectedEl.remove();
    selectedEl = null;
    floatingTools.style.display = "none";
  };

  viewport.onmousedown = async (e) => {
    if (e.target.closest(".tool-handle")) return;
    if (selectedEl) selectedEl.classList.remove("active-part");
    let foundEl = null;
    const candidates = document.elementsFromPoint(e.clientX, e.clientY);
    for (let el of candidates) {
      if (
        el.classList.contains("draggable") &&
        !(await isPixelTransparent(el, e.clientX, e.clientY))
      ) {
        foundEl = el;
        break;
      }
    }
    if (foundEl) {
      activeEl = foundEl;
      isDragging = true;
      selectedEl = activeEl;
      selectedEl.classList.add("active-part");
      const rect = activeEl.getBoundingClientRect();
      clickOffsetX = e.clientX - (rect.left + rect.width / 2);
      clickOffsetY = e.clientY - (rect.top + rect.height / 2);
      applyTransform(selectedEl);
    } else {
      selectedEl = null;
      floatingTools.style.display = "none";
    }
  };

  window.onmousemove = (e) => {
    const vp = viewport.getBoundingClientRect();
    if (isDragging && activeEl) {
      activeEl.style.left =
        (((e.clientX - vp.left - clickOffsetX) / vp.width) * 100).toFixed(2) +
        "%";
      activeEl.style.top =
        (((e.clientY - vp.top - clickOffsetY) / vp.height) * 100).toFixed(2) +
        "%";
      applyTransform(activeEl);
    } else if (isScaling && selectedEl) {
      const dist = Math.hypot(
        e.clientX - transformCenterX,
        e.clientY - transformCenterY,
      );
      selectedEl.dataset.scale = Math.max(
        0.2,
        Math.min(2.5, startScale * (dist / startDistance)),
      ).toFixed(3);
      applyTransform(selectedEl);
    } else if (isRotating && selectedEl) {
      selectedEl.dataset.rotate = Math.round(
        startRotation +
          (Math.atan2(
            e.clientY - transformCenterY,
            e.clientX - transformCenterX,
          ) -
            initialMouseAngle) *
            (180 / Math.PI),
      );
      applyTransform(selectedEl);
    }
  };

  window.onmouseup = () => {
    isDragging = isScaling = isRotating = false;
    activeEl = null;
  };

  async function saveDecoratedBottle() {
    const sprites = Array.from(viewport.querySelectorAll(".draggable")).sort(
      (a, b) =>
        (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0),
    );
    if (sprites.length === 0 || !currentBottle) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const vp = viewport.getBoundingClientRect();
    for (const s of sprites) {
      const r = s.getBoundingClientRect();
      minX = Math.min(minX, r.left - vp.left);
      minY = Math.min(minY, r.top - vp.top);
      maxX = Math.max(maxX, r.right - vp.left);
      maxY = Math.max(maxY, r.bottom - vp.top);
    }

    const pad = 15;
    const canvas = document.createElement("canvas");
    const cropW = Math.max(1, maxX - minX + pad * 2);
    const cropH = Math.max(1, maxY - minY + pad * 2);
    const exportScale = 1.0;
    canvas.width = cropW * exportScale;
    canvas.height = cropH * exportScale;
    const ctx = canvas.getContext("2d");

    for (const s of sprites) {
      const r = s.getBoundingClientRect();
      const centerX = r.left - vp.left + r.width / 2;
      const centerY = r.top - vp.top + r.height / 2;
      const scale = parseFloat(s.dataset.scale) || 0.7;
      const rotation = (parseFloat(s.dataset.rotate) || 0) * (Math.PI / 180);
      const dw = s.naturalWidth * scale * exportScale;
      const dh = s.naturalHeight * scale * exportScale;
      ctx.save();
      ctx.translate(
        (centerX - (minX - pad)) * exportScale,
        (centerY - (minY - pad)) * exportScale,
      );
      ctx.rotate(rotation);
      ctx.drawImage(s, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }

    try {
      const imgData = canvas.toDataURL("image/png", 0.8);
      await updateDoc(doc(db, "users", username), {
        [`manifestations.${horseID}.isBottled`]: true,
        [`manifestations.${horseID}.finalImage`]: imgData,
        activeHorseName: "",
      });

      const successOverlay = document.createElement("div");
      successOverlay.className = "modal-overlay";
      successOverlay.innerHTML = `
        <div class="win95-dialog">
          <div class="win95-title"><span>Registry</span></div>
          <div style="padding: 20px; text-align: center;">
            <p style="font-size: 12px; margin-bottom: 15px; color: #000;">The glue has been saved for eternity.</p>
            <button class="btn-95 success-close" style="width: 60px;">OK</button>
          </div>
        </div>`;
      container.appendChild(successOverlay);
      successOverlay.querySelector(".success-close").onclick = () => {
        window.location.hash = "#";
      };
    } catch (e) {
      console.error(e);
      showDialog(container, "Failed to seal bottle. Check your connection.");
    }
  }

  document.getElementById("btn-save-bottle").onclick = saveDecoratedBottle;
  updateSidebar();
}

// --- ASSEMBLY PHASE ---
function renderDressUpPhase(
  container,
  db,
  username,
  manifestations,
  activeName,
) {
  let catalogHTML = "";
  let stagedKey = ""; // Use the ID consistently

  const mList = Object.keys(manifestations).filter(
    (n) => !manifestations[n].isBottled,
  );
  if (mList.length > 0) {
    catalogHTML += `<div class="catalog-category"><h4>Honored Manifestations</h4>`;
    mList.forEach((id) => {
      const horse = manifestations[id];
      const displayName = horse.name || id;
      const b = horse.isBoiled;
      catalogHTML += `<div class="manifestation-name-box" draggable="${!b}" data-id="${id}" style="${b ? "background:#808080; color:#fff; opacity:0.6;" : "background:#fff; color:#000;"}">${displayName} ${b ? "(Boiled)" : ""}</div>`;
    });
    catalogHTML += `</div><hr style="border:0; border-top:1px solid #808080; margin:5px 0;">`;
  }

  for (const [cat, files] of Object.entries(PART_CATALOG)) {
    if (files.length === 0) continue;
    catalogHTML += `<div class="catalog-category"><h4>${cat.replace(/_/g, " ")}</h4><div style="display:flex; flex-wrap:wrap;">
      ${[...new Set(files)].map((f) => `<img src="${ASSET_PATH}${f}" class="catalog-item" draggable="true" data-file="${f}" data-category="${cat}">`).join("")}
    </div></div>`;
  }

  container.innerHTML = `
    <div class="game-wrapper">
      <div class="win95-window-sidebar" id="main-sidebar">
        <div class="win95-title"><span>assembly.exe</span></div>
        <div class="catalog-sidebar">${catalogHTML}</div>
        <div style="padding: 4px; background: #c0c0c0; border-top: 2px outset #fff;">
          <button id="btn-begin-boil" class="btn-95" style="width:100%; font-weight:bold;">BEGIN THE BOILING</button>
        </div>
      </div>
      <div class="viewport-area" id="game-viewport" style="background-image: url('${ASSET_PATH}bg_dressup_room.jpg'); cursor: default;">
        <div id="floating-tools" class="floating-tools" style="user-select: none;">
          <div class="group-stack">
            <div id="handle-forward" class="tool-handle">▲</div>
            <div id="handle-backward" class="tool-handle">▼</div>
          </div>
          <div id="handle-scale" class="tool-handle">⤡</div>
          <div id="handle-rotate" class="tool-handle">⟳</div>
          <div id="handle-delete" class="tool-handle">✖</div>
        </div>
      </div>
      <div id="naming-modal" class="modal-overlay" style="display:none;">
        <div class="win95-dialog"><div class="win95-title"><span>Registry</span></div><div style="padding:15px;">
          <p style="font-size:12px; color:#000;">Name this connection:</p>
          <input type="text" id="horse-name-input" class="win95-input" value="" placeholder="Enter name...">
          <div style="display:flex; justify-content:flex-end; gap:5px;"><button id="modal-cancel" class="btn-95">Return</button><button id="modal-confirm" class="btn-95" style="font-weight:bold;">Confirm</button></div>
        </div></div>
      </div>
    </div>`;

  injectXPTaskbar(container);

  const viewport = document.getElementById("game-viewport"),
    floatingTools = document.getElementById("floating-tools"),
    modal = document.getElementById("naming-modal"),
    sidebar = document.getElementById("main-sidebar");
  let activeEl = null,
    selectedEl = null,
    isDraggingPart = false,
    isScaling = false,
    isRotating = false;
  let clickOffsetX = 0,
    clickOffsetY = 0,
    transformCenterX = 0,
    transformCenterY = 0,
    startDistance = 0,
    startScale = 1,
    initialMouseAngle = 0,
    startRotation = 0;

  sidebar.onmousedown = (e) => e.stopPropagation();

  const applyTransform = (el) => {
    el.style.transform = `translate(-50%, -50%) scale(${el.dataset.scale}) rotate(${el.dataset.rotate}deg)`;
    const s = parseFloat(el.dataset.scale || "0.7");
    floatingTools.style.width = Math.max(80, el.offsetWidth * s) + "px";
    floatingTools.style.height = Math.max(80, el.offsetHeight * s) + "px";
    floatingTools.style.left = el.style.left;
    floatingTools.style.top = el.style.top;
    floatingTools.style.display = "block";
  };

  const spawnPart = (data, autoSelect = true) => {
    if (!data.file) return;
    const img = document.createElement("img");
    img.className = "sprite-part draggable";
    img.dataset.file = data.file;
    img.dataset.category = data.category;
    const s = parseFloat(data.scale);
    const r = parseFloat(data.rotate);
    const z = parseInt(data.zIndex);
    img.dataset.scale = isNaN(s) ? 0.7 : s;
    img.dataset.rotate = isNaN(r) ? 0 : r;
    img.style.zIndex = isNaN(z) ? CATEGORY_Z_INDEX[data.category] || 10 : z;
    img.style.left = data.x;
    img.style.top = data.y;
    img.ondragstart = (e) => e.preventDefault();
    if (data.category && data.category.includes("_back"))
      img.style.filter = "brightness(0.7)";
    img.onload = () => {
      if (autoSelect) {
        if (selectedEl) selectedEl.classList.remove("active-part");
        selectedEl = img;
        selectedEl.classList.add("active-part");
        stagedKey = "";
      }
      applyTransform(img);
    };
    img.src = ASSET_PATH + data.file;
    viewport.appendChild(img);
  };

  container.querySelectorAll(".manifestation-name-box").forEach((box) => {
    if (box.getAttribute("draggable") === "true")
      box.ondragstart = (e) => {
        e.dataTransfer.setData("source", "saved");
        e.dataTransfer.setData("id", box.dataset.id);
      };
  });

  container.querySelectorAll(".catalog-item").forEach((item) => {
    item.ondragstart = (e) => {
      e.dataTransfer.setData("source", "catalog");
      e.dataTransfer.setData("file", e.target.dataset.file);
      e.dataTransfer.setData("category", e.target.dataset.category);
    };
  });

  viewport.ondragover = (e) => e.preventDefault();
  viewport.ondrop = (e) => {
    e.preventDefault();
    const vp = viewport.getBoundingClientRect();
    if (e.dataTransfer.getData("source") === "saved") {
      const id = e.dataTransfer.getData("id");
      if (manifestations[id]) {
        stagedKey = id;
        viewport.querySelectorAll(".draggable").forEach((el) => el.remove());
        manifestations[id].config.forEach((p) => spawnPart(p, false));
      }
    } else {
      spawnPart(
        {
          file: e.dataTransfer.getData("file"),
          category: e.dataTransfer.getData("category"),
          x: (((e.clientX - vp.left) / vp.width) * 100).toFixed(2) + "%",
          y: (((e.clientY - vp.top) / vp.height) * 100).toFixed(2) + "%",
        },
        true,
      );
    }
  };

  document.getElementById("handle-forward").onclick = (e) => {
    e.stopPropagation();
    if (selectedEl)
      selectedEl.style.zIndex = parseInt(selectedEl.style.zIndex) + 1;
  };
  document.getElementById("handle-backward").onclick = (e) => {
    e.stopPropagation();
    if (selectedEl)
      selectedEl.style.zIndex = Math.max(
        0,
        parseInt(selectedEl.style.zIndex) - 1,
      );
  };

  document.getElementById("handle-scale").onmousedown = (e) => {
    if (!selectedEl) return;
    e.stopPropagation();
    isScaling = true;
    startScale = parseFloat(selectedEl.dataset.scale);
    const rect = selectedEl.getBoundingClientRect();
    transformCenterX = rect.left + rect.width / 2;
    transformCenterY = rect.top + rect.height / 2;
    startDistance =
      Math.hypot(e.clientX - transformCenterX, e.clientY - transformCenterY) ||
      0.1;
    e.preventDefault();
  };
  document.getElementById("handle-rotate").onmousedown = (e) => {
    if (!selectedEl) return;
    e.stopPropagation();
    isRotating = true;
    startRotation = parseFloat(selectedEl.dataset.rotate);
    const rect = selectedEl.getBoundingClientRect();
    transformCenterX = rect.left + rect.width / 2;
    transformCenterY = rect.top + rect.height / 2;
    initialMouseAngle = Math.atan2(
      e.clientY - transformCenterY,
      e.clientX - transformCenterX,
    );
    e.preventDefault();
  };
  document.getElementById("handle-delete").onclick = () => {
    if (selectedEl) {
      selectedEl.remove();
      selectedEl = null;
      floatingTools.style.display = "none";
    }
  };

  viewport.onmousedown = async (e) => {
    if (e.target.closest(".tool-handle")) return;
    if (selectedEl) selectedEl.classList.remove("active-part");
    let foundEl = null;
    const candidates = document.elementsFromPoint(e.clientX, e.clientY);
    for (let el of candidates) {
      if (
        el.classList.contains("draggable") &&
        !(await isPixelTransparent(el, e.clientX, e.clientY))
      ) {
        foundEl = el;
        break;
      }
    }
    if (foundEl) {
      activeEl = foundEl;
      isDraggingPart = true;
      selectedEl = activeEl;
      selectedEl.classList.add("active-part");
      const rect = activeEl.getBoundingClientRect();
      clickOffsetX = e.clientX - (rect.left + rect.width / 2);
      clickOffsetY = e.clientY - (rect.top + rect.height / 2);
      applyTransform(selectedEl);
    } else {
      selectedEl = null;
      floatingTools.style.display = "none";
    }
  };

  window.onmousemove = (e) => {
    const vp = viewport.getBoundingClientRect();
    if (isDraggingPart && activeEl) {
      activeEl.style.left =
        (((e.clientX - vp.left - clickOffsetX) / vp.width) * 100).toFixed(2) +
        "%";
      activeEl.style.top =
        (((e.clientY - vp.top - clickOffsetY) / vp.height) * 100).toFixed(2) +
        "%";
      applyTransform(activeEl);
    } else if (isScaling && selectedEl) {
      const dist = Math.hypot(
        e.clientX - transformCenterX,
        e.clientY - transformCenterY,
      );
      selectedEl.dataset.scale = Math.max(
        0.2,
        Math.min(2.5, startScale * (dist / startDistance)),
      ).toFixed(3);
      applyTransform(selectedEl);
    } else if (isRotating && selectedEl) {
      selectedEl.dataset.rotate = Math.round(
        startRotation +
          (Math.atan2(
            e.clientY - transformCenterY,
            e.clientX - transformCenterX,
          ) -
            initialMouseAngle) *
            (180 / Math.PI),
      );
      applyTransform(selectedEl);
    }
  };

  window.onmouseup = () => {
    isDraggingPart = isScaling = isRotating = false;
    activeEl = null;
  };

  async function handleBoilSubmission(uniqueID, displayName) {
    const data = Array.from(viewport.querySelectorAll(".draggable"))
      .map((el) => {
        const s = parseFloat(el.dataset.scale);
        const r = parseFloat(el.dataset.rotate);
        const z = parseInt(el.style.zIndex);
        return {
          file: el.dataset.file,
          category: el.dataset.category,
          x: el.style.left,
          y: el.style.top,
          zIndex: isNaN(z) ? CATEGORY_Z_INDEX[el.dataset.category] || 10 : z,
          scale: isNaN(s) ? 0.7 : s,
          rotate: isNaN(r) ? 0 : r,
        };
      })
      .filter((p) => p.file);

    await updateDoc(doc(db, "users", username), {
      [`manifestations.${uniqueID}`]: {
        name: displayName,
        config: data,
        isBoiled: false,
      },
      activeHorseName: uniqueID,
    });
    // Passing both the internal ID and the display Name
    renderBoilingPhase(container, uniqueID, displayName, data, db, username);
  }

  document.getElementById("btn-begin-boil").onclick = () => {
    if (viewport.querySelectorAll(".draggable").length === 0)
      return showDialog(container, "The vessel is empty.");
    if (stagedKey && manifestations[stagedKey]) {
      handleBoilSubmission(
        stagedKey,
        manifestations[stagedKey].name || "Unnamed",
      );
    } else {
      const input = document.getElementById("horse-name-input");
      input.value = "";
      modal.style.display = "flex";
    }
  };

  document.getElementById("modal-cancel").onclick = () =>
    (modal.style.display = "none");
  document.getElementById("modal-confirm").onclick = async () => {
    const n = document.getElementById("horse-name-input").value || "Unnamed";
    const newID = "horse_" + Date.now();
    modal.style.display = "none";
    handleBoilSubmission(newID, n);
  };
}

// --- BOILING PHASE ---
// FIXED: Added horseID to the parameter definition to match the 6-argument call
function renderBoilingPhase(container, horseID, name, config, db, username) {
  const partsToBoil = config
    .filter((p) => p.file && !p.file.startsWith("torso_"))
    .map((p, i) => ({
      ...p,
      id: `part-${i}`,
      essence: 1.0,
      simmer: 0,
      posX: parseFloat(p.x),
      posY: parseFloat(p.y),
      velX: 0,
      velY: 0,
      scale: parseFloat(p.scale) * 0.5,
      rotate: parseFloat(p.rotate || 0),
      submersion: 30 + Math.random() * 40,
      dead: false,
      resistance: 200 + Math.random() * 500,
    }));

  const totalInitialEssence = partsToBoil.length;

  container.innerHTML = `
    <div class="game-wrapper">
      <div class="viewport-area" id="boil-viewport" style="background-image: url('${ASSET_PATH}bg_boiler_room.jpg'); cursor: none;">
        <img src="${ASSET_PATH}pot_back.png" class="pot-static" style="left:${POT_COORDS.back.left}; top:${POT_COORDS.back.top}; z-index:10; pointer-events:none;" draggable="false">
        <div id="sub-layer" style="position:absolute; width:100%; height:100%; z-index:20; pointer-events:none;"></div>
        <img src="${ASSET_PATH}pot_liquid.png" class="pot-static" style="left:${POT_COORDS.liquid.left}; top:${POT_COORDS.liquid.top}; z-index:30; opacity:0.8; pointer-events:none;" draggable="false">
        <div id="float-layer" style="position:absolute; width:100%; height:100%; z-index:40; pointer-events:none;"></div>
        <img id="boil-ladle" src="${ASSET_PATH}ladle.png" style="position:absolute; z-index:45; pointer-events:none; transform:translate(-50%, -50%);">
        <img src="${ASSET_PATH}pot_front.png" class="pot-static" style="left:${POT_COORDS.front.left}; top:${POT_COORDS.front.top}; z-index:50; pointer-events:none;" draggable="false">
        <div id="particle-container" style="position:absolute; width:100%; height:100%; z-index:115; pointer-events:none;"></div>
        <div style="position:absolute; bottom:20px; width:100%; display:flex; flex-direction:column; align-items:center; color:white; z-index:200; pointer-events:none;">
            <h2 style="text-shadow:2px 2px #000; margin:0;">DISSOLVING ${name.toUpperCase()}...</h2>
            <div style="width: 300px; height: 18px; background: #c0c0c0; border: 2px inset #808080; margin-top: 5px; position: relative; overflow: hidden;">
                <div id="boil-progress-fill" style="width: 0%; height: 100%; background: #000080; transition: width 0.1s linear;"></div>
            </div>
        </div>
      </div>
    </div>`;

  injectXPTaskbar(container);

  const viewport = document.getElementById("boil-viewport"),
    pContainer = document.getElementById("particle-container"),
    ladle = document.getElementById("boil-ladle"),
    progressFill = document.getElementById("boil-progress-fill");

  const subLayer = document.getElementById("sub-layer"),
    floatLayer = document.getElementById("float-layer");

  let mouseX = 0,
    mouseY = 0,
    lastX = 0,
    lastY = 0,
    velocity = 0;
  let cumulativeStirTime = 0,
    lastFrameTime = Date.now();

  viewport.onmousemove = (e) => {
    const r = viewport.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
    velocity += Math.hypot(mouseX - lastX, mouseY - lastY);
    lastX = mouseX;
    lastY = mouseY;
    ladle.style.left = mouseX + "px";
    ladle.style.top = mouseY + "px";
  };

  partsToBoil.forEach((p) => {
    p.elSub = document.createElement("img");
    p.elFloat = document.createElement("img");
    [p.elSub, p.elFloat].forEach((img) => {
      img.src = ASSET_PATH + p.file;
      img.className = "boil-part-sprite bobbing";
      img.style.setProperty("--s", p.scale);
      img.style.setProperty("--r", p.rotate + "deg");
      img.style.pointerEvents = "none";
      img.draggable = false;
      img.onerror = () => {
        img.style.display = "none";
      };
    });
    p.elSub.style.filter = "brightness(0.3) blur(2px)";
    p.elSub.style.clipPath = `inset(${p.submersion}% 0 0 0)`;
    p.elFloat.style.clipPath = `inset(0 0 ${100 - p.submersion}% 0)`;
    subLayer.appendChild(p.elSub);
    floatLayer.appendChild(p.elFloat);
  });

  function spawnParticle(type, x, y) {
    const p = document.createElement("img");
    p.src =
      ASSET_PATH +
      (type === "bubble"
        ? Math.random() > 0.5
          ? "bubble_1.png"
          : "bubble_2.png"
        : "steam.png");
    p.className = type;
    p.style.left = x + "px";
    p.style.top = y + "px";
    pContainer.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }

  function gameLoop() {
    let now = Date.now();
    let dt = now - lastFrameTime;
    lastFrameTime = now;

    if (Math.random() > 0.94)
      spawnParticle(
        "steam",
        200 + Math.random() * (viewport.clientWidth - 400),
        viewport.clientHeight * 0.7,
      );

    const isStirring = velocity > 4;

    partsToBoil.forEach((p1, i) => {
      if (p1.dead) return;
      for (let j = i + 1; j < partsToBoil.length; j++) {
        const p2 = partsToBoil[j];
        if (p2.dead) continue;
        let dx = p1.posX - p2.posX;
        let dy = p1.posY - p2.posY;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
          dx = Math.random() - 0.5 || 0.1;
          dy = Math.random() - 0.5 || 0.1;
          dist = Math.hypot(dx, dy);
        }
        const minDist = 8;
        if (dist < minDist) {
          const force = (minDist - dist) * 0.02;
          const nx = dx / dist;
          const ny = dy / dist;
          p1.velX += nx * force;
          p1.velY += ny * force;
          p2.velX -= nx * force;
          p2.velY -= ny * force;
        }
      }
    });

    if (isStirring) {
      cumulativeStirTime += dt;
      if (Math.random() > 0.75) spawnParticle("bubble", mouseX, mouseY);
      if (Math.random() > 0.985) {
        const span = document.createElement("span");
        span.className = "floating-thought";
        span.innerText =
          RECLAMATION_PHRASES[
            Math.floor(Math.random() * RECLAMATION_PHRASES.length)
          ];
        span.style.left = mouseX + "px";
        span.style.top = mouseY + "px";
        pContainer.appendChild(span);
        setTimeout(() => span.remove(), 5000);
      }
      partsToBoil.forEach((p) => {
        if (p.dead) return;
        const dx = viewport.clientWidth * (p.posX / 100) - mouseX;
        const dy = viewport.clientHeight * (p.posY / 100) - mouseY;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) dist = 0.1;
        if (dist < 180) {
          const force = (180 - dist) / 180;
          p.velX += (dx / dist) * force * 0.5;
          p.velY += (dy / dist) * force * 0.5;
          p.simmer += velocity * 0.25;
          if (p.simmer > p.resistance) p.essence -= velocity * 0.00008 + 0.001;
        } else if (cumulativeStirTime > 20000) {
          p.simmer += velocity * 0.25;
          if (p.simmer > p.resistance) p.essence -= velocity * 0.00008 + 0.001;
        }
      });
    }

    let currentSum = 0;
    partsToBoil.forEach((p) => {
      if (!p.dead) {
        currentSum += Math.max(0, p.essence);
        p.posX += p.velX;
        p.posY += p.velY;
        p.velX *= 0.92;
        p.velY *= 0.92;
        if (p.posX < 25) {
          p.posX = 25;
          p.velX *= -0.5;
        }
        if (p.posX > 75) {
          p.posX = 75;
          p.velX *= -0.5;
        }
        if (p.posY < 40) {
          p.posY = 40;
          p.velY *= -0.5;
        }
        if (p.posY > 70) {
          p.posY = 70;
          p.velY *= -0.5;
        }
        p.elSub.style.left = p.elFloat.style.left = p.posX + "%";
        p.elSub.style.top = p.elFloat.style.top = p.posY + "%";
        p.elSub.style.opacity = p.elFloat.style.opacity = Math.max(
          0,
          p.essence,
        );
        if (p.essence <= 0) {
          p.dead = true;
          p.elSub.remove();
          p.elFloat.remove();
        }
      }
    });

    progressFill.style.width =
      Math.min(
        100,
        ((totalInitialEssence - currentSum) / totalInitialEssence) * 100,
      ) + "%";
    velocity *= 0.85;

    if (partsToBoil.every((p) => p.dead)) {
      // FIXED: Correct ID passing
      setTimeout(
        () => transitionToBottlePhase(container, horseID, db, username),
        1500,
      );
    } else {
      requestAnimationFrame(gameLoop);
    }
  }
  requestAnimationFrame(gameLoop);
}

async function transitionToBottlePhase(container, horseID, db, username) {
  try {
    // CORRECTED: Hit original ID key, not the display name
    await updateDoc(doc(db, "users", username), {
      [`manifestations.${horseID}.isBoiled`]: true,
    });
  } catch (err) {
    console.error(err);
  }
  container.innerHTML = `
    <div class="game-wrapper" style="background-image: url('${ASSET_PATH}bg_boiler_room.jpg'); background-size: cover; background-position: center; display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <div style="background: rgba(192, 192, 192, 0.9); padding: 20px; border: 2px outset #fff; text-align: center; box-shadow: 4px 4px 15px rgba(0,0,0,0.5);">
        <h1 style="color:#000; font-family:'MS Sans Serif'; font-size: 18px; margin-top: 0;">TRANSFORMATION COMPLETE.</h1>
        <button class="btn-95" onclick="location.reload()" style="margin-top: 15px; font-weight: bold; padding: 5px 15px;">NEXT: DECORATE THE VESSEL</button>
      </div>
    </div>`;
  injectXPTaskbar(container);
}

export function unmountGlueFactory() {
  const container = document.getElementById("glue-factory-root");
  if (container) container.innerHTML = "";
  const taskbar = document.getElementById("xp-taskbar");
  if (taskbar) taskbar.remove();
  window.onresize = null;
}
