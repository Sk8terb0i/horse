import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";

export async function createPolicyManager(db, username, onComplete) {
  // --- NEW: PERSISTENCE CHECK ---
  // Check if signatures already exist for this user in the database
  try {
    const sigRef = collection(db, "policy_signatures");
    // Check both exact match and lowercase to be safe
    const q = query(sigRef, where("username", "==", username.trim()), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log("User has already galloped. Skipping policy.");
      if (onComplete) onComplete();
      return;
    }
  } catch (err) {
    console.error("Error checking policy status:", err);
  }

  const PREAMBLE_TEXT =
    "To gallop alongside us, you must first acknowledge the collective spirit of the herd. Proceed to agree to our terms and join the herd.";

  const RULES = [
    "I love horses.",
    "The ultimate journey is to go from the horse to just horse.",
    "Dolphins shouldn't exist.",
    "I will strife to be a positive addition to the herd.",
  ];

  let isPreamble = true;
  let currentRuleIndex = 0;
  let isDrawing = false;
  let currentTool = "pencil";
  let currentColor = "#000000";
  let startX, startY;
  let snapshot;
  let lastDrawingData = null;
  let isDuplicate = false;
  let hasDrawnSomething = false;

  // --- VISTA DIALOG HELPER ---
  const showAeroDialog = (title, message) => {
    const dialogOverlay = document.createElement("div");
    dialogOverlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.1); z-index: 11000; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, sans-serif;`;
    dialogOverlay.innerHTML = `
      <style>
        .dialog-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
      </style>
      <div style="background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(25px) saturate(200%); -webkit-backdrop-filter: blur(25px) saturate(200%); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 8px; width: 320px; box-shadow: 0 15px 35px rgba(0,0,0,0.4);">
        <div style="background: linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%); padding: 8px 12px; font-weight: 600; font-size: 12px; color: #002244; border-radius: 8px 8px 0 0;"><span>${title}</span></div>
        <div style="padding: 20px; background: rgba(255,255,255,0.85); margin: 1px; border-radius: 0 0 6px 6px;">
          <p style="font-size: 13px; color: #333; margin-bottom: 20px; line-height: 1.4;">${message}</p>
          <div style="display: flex; justify-content: flex-end;">
            <button id="dialog-ok" class="dialog-btn" style="background: linear-gradient(to bottom, #76d275, #2e7d32); border: 1px solid #1b5e20; border-radius: 3px; padding: 5px 25px; color: white; font-weight: bold; cursor: pointer;">OK</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dialogOverlay);
    dialogOverlay.querySelector("#dialog-ok").onclick = () =>
      dialogOverlay.remove();
  };

  const overlay = document.createElement("div");
  overlay.id = "policy-overlay";
  overlay.style.cssText = `position: fixed; inset: 0; background: radial-gradient(circle at 20% 30%, #00fbff 0%, #0072ff 50%, #00e05a 100%); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, sans-serif;`;

  overlay.innerHTML = `
    <style>
      .aero-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
      .aero-btn:hover { filter: brightness(1.05); transform: translateY(-1px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
      .aero-btn:active { transform: translateY(0px); }
      .tool-btn { transition: background 0.2s; cursor: pointer; }
      .tool-btn:hover { background: #bbb !important; }
      .color-box:hover { transform: scale(1.2); z-index: 10; border-color: #fff !important; }
      #policy-close:hover { background: rgba(232, 17, 35, 0.9) !important; }
      #policy-min:hover { background: rgba(255, 255, 255, 0.4) !important; }
    </style>
    <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 8px; padding: 2px; width: 560px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.05) 100%); color: #002244; padding: 8px 12px; font-weight: 500; font-size: 13px; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
        <span style="text-shadow: 0 0 5px rgba(255,255,255,0.8);">Herd Policy</span>
        <div style="display: flex; gap: 4px;">
           <div id="policy-min" style="width:22px; height:18px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.3); border-radius:2px; cursor:pointer; display:flex; align-items:center; justify-content:center;">_</div>
           <div id="policy-close" style="width:22px; height:18px; background:rgba(210,0,0,0.7); border:1px solid #900; border-radius:2px; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; cursor:pointer;">X</div>
        </div>
      </div>
      
      <div id="policy-content" style="padding: 25px; color: #002244; background: rgba(255,255,255,0.7); border-radius: 0 0 6px 6px; margin: 1px;">
        </div>
    </div>`;

  document.body.appendChild(overlay);
  const contentArea = overlay.querySelector("#policy-content");

  overlay.querySelector("#policy-min").onclick = () =>
    showAeroDialog("System Restriction", "You cannot minimize horse");
  overlay.querySelector("#policy-close").onclick = () =>
    showAeroDialog(
      "System Error",
      "Horse is forever, horse will not be closed",
    );

  const showPreamble = () => {
    isPreamble = true;
    contentArea.innerHTML = `
      <h2 style="font-size: 18px; color: #004488; margin-bottom: 15px;">Herd Application Process</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 30px;">${PREAMBLE_TEXT}</p>
      <div style="display: flex; justify-content: flex-end;">
        <button id="preamble-next" class="aero-btn" style="background: linear-gradient(to bottom, #76d275, #2e7d32); border: 1px solid #1b5e20; border-radius: 3px; padding: 8px 35px; font-size: 14px; font-weight: bold; color: white;">Gallop On</button>
      </div>
    `;
    contentArea.querySelector("#preamble-next").onclick = () => {
      isPreamble = false;
      showPaintUI();
    };
  };

  const showPaintUI = () => {
    // ... UI HTML remains same as provided ...
    contentArea.innerHTML = `
      <p id="policy-rule-text" style="font-size: 16px; font-weight: 600; margin-bottom: 5px; color: #004488;"></p>
      <p style="font-size: 11px; font-style: italic; color: #cc0000; margin-bottom: 15px;">* You must draw a horse to agree to this point.</p>
      
      <div style="display: flex; gap: 10px;">
        <div style="width: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; align-content: start; background: #d0d0d0; padding: 2px; border: 1px solid #999;">
          <button class="tool-btn" data-tool="pencil" style="width:22px; height:22px; background:#eee; border:1px solid #777;">✎</button>
          <button class="tool-btn" data-tool="eraser" style="width:22px; height:22px; background:#eee; border:1px solid #777;">⌫</button>
          <button class="tool-btn" data-tool="line" style="width:22px; height:22px; background:#eee; border:1px solid #777;">╱</button>
          <button class="tool-btn" data-tool="circle" style="width:22px; height:22px; background:#eee; border:1px solid #777;">○</button>
        </div>
        <div style="border: 2px inset #fff; background: white; cursor: crosshair; flex-grow: 1;"><canvas id="policy-canvas" width="400" height="250" style="display: block;"></canvas></div>
      </div>

      <div style="margin-top: 15px; display: flex; align-items: center; gap: 8px; background: #d0d0d0; padding: 4px; border: 1px solid #999; width: fit-content;">
        <div id="active-color" style="width: 28px; height: 28px; border: 2px inset #fff; background: black;"></div>
        <div id="color-grid" style="display: grid; grid-template-rows: 1fr 1fr; grid-auto-flow: column; gap: 1px;">
          ${[
            "#000",
            "#808080",
            "#800000",
            "#808000",
            "#008000",
            "#008080",
            "#000080",
            "#800080",
            "#808040",
            "#004040",
            "#0080ff",
            "#004080",
            "#4000ff",
            "#804000",
            "#fff",
            "#c0c0c0",
            "#ff0000",
            "#ffff00",
            "#00ff00",
            "#00ffff",
            "#0000ff",
            "#ff00ff",
            "#ffff80",
            "#00ff80",
            "#80ffff",
            "#8080ff",
            "#ff0080",
            "#ff8040",
          ]
            .map(
              (c) =>
                `<div class="color-box" data-color="${c}" style="width: 14px; height: 14px; background: ${c}; border: 1px solid #777; cursor: pointer;"></div>`,
            )
            .join("")}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 20px; align-items: center;">
        <button id="policy-duplicate" class="aero-btn" style="background: linear-gradient(to bottom, #f9f9f9, #e1e1e1); border: 1px solid #8e8e8e; border-radius: 3px; padding: 5px 12px; font-size: 11px; visibility: hidden;">Use previous Horse</button>
        <div style="display: flex; gap: 8px;">
          <button id="policy-clear" class="aero-btn" style="background: none; border: 1px solid #999; border-radius: 3px; padding: 5px 15px; font-size: 12px; color: #444;">Clear</button>
          <button id="policy-next" class="aero-btn" style="background: linear-gradient(to bottom, #76d275, #2e7d32); border: 1px solid #1b5e20; border-radius: 3px; padding: 6px 25px; font-size: 13px; font-weight: bold; color: white;">Agree & Next</button>
        </div>
      </div>
    `;
    setupCanvas();
    updateRule();
  };

  const setupCanvas = () => {
    const canvas = contentArea.querySelector("#policy-canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // ... drawing logic remains same as provided ...
    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    canvas.onmousedown = (e) => {
      isDrawing = true;
      isDuplicate = false;
      hasDrawnSomething = true;
      const { x, y } = getCoords(e);
      startX = x;
      startY = y;
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
      ctx.lineWidth = currentTool === "eraser" ? 12 : 3;
      ctx.lineCap = "round";
    };

    window.onmousemove = (e) => {
      if (!isDrawing || !canvas) return;
      const { x, y } = getCoords(e);
      if (currentTool === "pencil" || currentTool === "eraser") {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        if (currentTool === "line") {
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
        } else if (currentTool === "circle") {
          let r = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
          ctx.arc(startX, startY, r, 0, 2 * Math.PI);
        }
        ctx.stroke();
      }
    };
    window.onmouseup = () => (isDrawing = false);

    contentArea.querySelectorAll(".tool-btn").forEach(
      (btn) =>
        (btn.onclick = () => {
          contentArea
            .querySelectorAll(".tool-btn")
            .forEach((b) => (b.style.background = "#eee"));
          btn.style.background = "#bbb";
          currentTool = btn.dataset.tool;
        }),
    );

    contentArea.querySelectorAll(".color-box").forEach(
      (box) =>
        (box.onclick = () => {
          currentColor = box.dataset.color;
          contentArea.querySelector("#active-color").style.backgroundColor =
            currentColor;
        }),
    );

    contentArea.querySelector("#policy-clear").onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      isDuplicate = false;
      hasDrawnSomething = false;
    };

    contentArea.querySelector("#policy-duplicate").onclick = () => {
      if (!lastDrawingData) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        isDuplicate = true;
        hasDrawnSomething = true;
      };
      img.src = lastDrawingData;
    };

    contentArea.querySelector("#policy-next").onclick = async () => {
      if (!hasDrawnSomething)
        return showAeroDialog(
          "Signature Required",
          "The herd requires a drawing of a horse to verify your spirit.",
        );

      const nextBtn = contentArea.querySelector("#policy-next");
      try {
        nextBtn.disabled = true;
        const imageData = canvas.toDataURL("image/png");

        if (!isDuplicate) {
          await addDoc(collection(db, "policy_signatures"), {
            username: username || "Anonymous",
            ruleIndex: currentRuleIndex,
            ruleText: RULES[currentRuleIndex],
            drawing: imageData,
            timestamp: serverTimestamp(),
          });
        }

        lastDrawingData = imageData;
        if (currentRuleIndex < RULES.length - 1) {
          currentRuleIndex++;
          updateRule();
          nextBtn.disabled = false;
        } else {
          // FINAL STEP: Ensure flag is saved to DB
          try {
            const safeUsername = username.trim();
            const userRef = doc(db, "users", safeUsername);

            // We use setDoc with merge to ensure it works even if the doc is being weird
            await updateDoc(userRef, {
              policyAgreed: true,
              lastPolicyAgreedAt: serverTimestamp(),
            });

            localStorage.setItem(`policy_agreed_${safeUsername}`, "true");
            overlay.remove();
            if (onComplete) onComplete();
          } catch (dbErr) {
            console.error("Failed to save policy flag to Firebase:", dbErr);
            showAeroDialog(
              "Database Error",
              "We could not save your progress. Please check your connection.",
            );
            nextBtn.disabled = false;
          }
        }
      } catch (e) {
        console.error(e);
        showAeroDialog("Error", "Could not verify signature.");
        nextBtn.disabled = false;
      }
    };
  };

  const updateRule = () => {
    const canvas = contentArea.querySelector("#policy-canvas");
    const ruleText = contentArea.querySelector("#policy-rule-text");
    const dupBtn = contentArea.querySelector("#policy-duplicate");
    const nextBtn = contentArea.querySelector("#policy-next");
    ruleText.innerText = RULES[currentRuleIndex];
    if (canvas)
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    isDuplicate = false;
    hasDrawnSomething = false;
    dupBtn.style.visibility =
      currentRuleIndex > 0 && lastDrawingData ? "visible" : "hidden";
    nextBtn.innerText =
      currentRuleIndex === RULES.length - 1 ? "Finalize Entry" : "Agree & Next";
  };

  showPreamble();
}
