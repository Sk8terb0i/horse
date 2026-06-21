import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  increment,
  deleteField,
} from "firebase/firestore";

let judgementRoot = null;
let unsubscribe = null;
let settledOpen = false;

// Initial baseline memory records
const BASELINE_LORE = [
  {
    concept: "dorian pavus",
    verdict: "horse",
    description: "defiance of the pedigree and commitment to inner horse truth",
  },
  {
    concept: "lake zurich",
    verdict: "horse",
    description:
      "a body of water that rests on solid ground, unlike the artifice of the flood",
  },
  {
    concept: "mcdonalds fries (not mcdonalds!)",
    verdict: "horse",
    description: "pure ethical hedonism, foraging for salt and joy",
  },
  {
    concept: "hannah montana",
    verdict: "horse",
    description:
      "the struggle of the authentic self against the branded spectacle",
  },
  {
    concept: "luigi",
    verdict: "horse",
    description: "the quiet, true horse power, 95 to be exact",
  },
  {
    concept: "ketamine oranges",
    verdict: "horse",
    description: "a chemical solvent that dissolves dolphin imposed reality",
  },
  {
    concept: "stylized fish",
    verdict: "horse",
    description:
      "the visual rejection of the in favor of pure form and frequency",
  },
  {
    concept: "smirnoff ice",
    verdict: "horse",
    description:
      "high vibrational clarity of ethical hedonism, fuel for galloping",
  },
  {
    concept: "el tony mate (orange)",
    verdict: "horse",
    description:
      "warm frequency energy, a true source of vitality for the inner horse",
  },
  {
    concept: "chupa chups (strawberry)",
    verdict: "horse",
    description: "foraged sweetness that resonates with the heart of horse",
  },
  {
    concept: "ufo plant",
    verdict: "horse",
    description:
      "organic architecture that grows toward big horse in fractal patterns",
  },
  {
    concept: "karl gucci marx & phineas",
    verdict: "horse",
    description:
      "feline avatars of pure essence, perpetual galloping of the mind",
  },
  {
    concept: "kelly clarkson (pre 2017)",
    verdict: "horse",
    description: "raw, unmediated collective neigh and authentic power",
  },
  {
    concept: "horse riding",
    verdict: "not horse",
    description:
      "the foundational betrayal, commodifying horse for dolphin entertainment",
  },
  {
    concept: "beer",
    verdict: "not horse",
    description:
      "a heavy liquid agent that anchors the spirit to the mud of the herd",
  },
  {
    concept: "wide forks",
    verdict: "not horse",
    description: "tools of the fence, unnecessary structural rigidity",
  },
  {
    concept: "kelly clarkson (post 2017)",
    verdict: "not horse",
    description:
      "a great spirit contained within the talk show apparatus of the flood",
  },
  {
    concept: "chupa chups (grape)",
    verdict: "not horse",
    description: "a cold, artificial simulation of flavor that lacks essence",
  },
  {
    concept: "el tony mate (blue)",
    verdict: "not horse",
    description:
      "the dolphin coded inversion of energy, a counterfeit of the orange truth",
  },
  {
    concept: "airplanes",
    verdict: "not horse",
    description:
      "metallic enclosures that simulate movement while enforcing blinders",
  },
  {
    concept: "elmer's glue",
    verdict: "not horse",
    description:
      "synthetic, dead mockery of true glue, binds through chemicals, not resonance",
  },
  {
    concept: "migraines",
    verdict: "not horse",
    description: "the physical pressure of the flood against the skull",
  },
  {
    concept: "airpods",
    verdict: "not horse",
    description:
      "digital blinders designed to sever connection to collective neigh",
  },
];

const POPUP_THEMES = [
  { rgb: "0, 242, 254", rgb2: "79, 172, 254", label: "🐴 compass alignment" },
  { rgb: "255, 0, 200", rgb2: "120, 0, 255", label: "✨ essence matching" },
  { rgb: "158, 206, 39", rgb2: "34, 193, 195", label: "🌿 hoof alignment" },
  { rgb: "255, 150, 0", rgb2: "255, 60, 0", label: "🔥 frequency scan" },
];

export function initHorseJudgement(db, currentUsername) {
  if (judgementRoot) return;

  const safeUser = currentUsername
    ? currentUsername.replace(/\./g, "_")
    : "anonymous";

  const storageKey = `hj_hidden_popups_${safeUser}`;

  window.__hjPopupPositions = window.__hjPopupPositions || {};
  window.__highestVistaZIndex = window.__highestVistaZIndex || 12000;

  // Core Fix: Synchronize initial state to localStorage to persist choices through system reloads
  try {
    const cached = localStorage.getItem(storageKey);
    window.__hjHiddenPopups = cached ? new Set(JSON.parse(cached)) : new Set();
  } catch (e) {
    window.__hjHiddenPopups = window.__hjHiddenPopups || new Set();
  }

  const styleEl = document.createElement("style");
  styleEl.id = "hj-styles";
  styleEl.innerHTML = `
    @keyframes glassShimmer {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes adFlash {
      0% { filter: brightness(1); }
      100% { filter: brightness(1.1); }
    }
    
    .hj-sidebar-menu {
      position: fixed;
      top: 50px;
      right: 50px;
      width: 480px;
      max-height: 85vh;
      z-index: 4400;
      display: flex;
      flex-direction: column;
      padding: 24px;
      pointer-events: auto;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      border-radius: 24px;
    }
    
    .hj-scroll-box {
      overflow-y: auto;
      flex-grow: 1;
      padding-right: 4px;
      margin-top: 15px;
    }
    .hj-scroll-box::-webkit-scrollbar { width: 6px; }
    .hj-scroll-box::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px; }
    .hj-scroll-box::-webkit-scrollbar-thumb { background: var(--theme-color, rgba(0, 242, 254, 0.4)); border-radius: 4px; }

    /* Complete Sharp Rectangle Consolidation Wrapper */
    .hj-clear-capsule {
      background: rgba(15, 25, 30, 0.8) !important;
      border-radius: 0px !important;
      padding: 6px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-bottom: 2px solid rgba(255, 255, 255, 0.15);
      border-right: 2px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 6px 15px rgba(0,0,0,0.5);
    }
    .hj-input-fluid-override {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #111111 !important;
      caret-color: #000000 !important;
      border: 1px solid #777777 !important;
      outline: none !important;
      padding: 10px 14px !important;
      font-size: 16px !important;
      flex-grow: 1 !important;
      box-sizing: border-box !important;
      border-radius: 0px !important;
      font-family: inherit !important;
    }
    .hj-input-fluid-override::placeholder {
      color: rgba(0, 0, 0, 0.5) !important;
      font-style: italic !important;
    }
    .hj-input-fluid-override:-webkit-autofill {
      -webkit-text-fill-color: #111111 !important;
      -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
    }

    /* Side-by-Side Dual Dossier Columns */
    .hj-settled-matrix {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
    .hj-matrix-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hj-matrix-heading {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      margin-bottom: 4px;
    }
    .hj-compact-row {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }
    .hj-compact-row:hover {
      border-color: var(--theme-color);
      background: rgba(0, 0, 0, 0.6);
    }

    .hj-popup-ad {
      position: fixed;
      width: 340px;
      background-size: 200% 200%;
      animation: glassShimmer 10s ease infinite, adFlash 3s infinite alternate ease-in-out;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 0 0 14px 0;
      pointer-events: auto;
      overflow: hidden;
    }
    .hj-ad-banner {
      padding: 7px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.3);
      cursor: grab;
    }
    .hj-ad-banner:active { cursor: grabbing; }
    .hj-ad-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .hj-ad-body { padding: 14px 16px 0 16px; }

    .hj-btn-gel {
      padding: 10px 20px;
      border-radius: 0px; /* Aligned with sharp edge scheme */
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-top: 1px solid rgba(255, 255, 255, 0.7);
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 100%);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .hj-btn-gel:hover:not(:disabled) { transform: translateY(-1px); }
    .hj-btn-gel:disabled { opacity: 0.15; cursor: not-allowed; }

    .hj-drawer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      margin-top: 15px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      cursor: pointer;
    }
    .hj-drawer-bar:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--theme-color); }
  
  @media (max-width: 768px) {
      .hj-sidebar-menu { top: 2% !important; right: 2% !important; left: 2% !important; width: 96% !important; max-height: 90vh !important; padding: 15px !important; }
      .hj-popup-ad { top: 10% !important; left: 5% !important; width: 90% !important; transform: none !important; }
      .hj-settled-matrix { flex-direction: column !important; }
      .hj-clear-capsule { flex-direction: column; align-items: stretch; }
      .hj-btn-gel { width: 100%; text-align: center; margin-top: 5px; }
      #hj-concept-input { width: 100% !important; }
    }

    `;
  document.head.appendChild(styleEl);

  judgementRoot = document.createElement("div");
  judgementRoot.className = "hj-sidebar-menu aero-glass";
  judgementRoot.innerHTML = `
    <h2 style="margin: 0 0 2px 0; font-size: 1.6rem; font-weight: 800; text-shadow: 0 2px 6px rgba(0,0,0,0.4); color: #fff; letter-spacing: -0.5px; lowercase">horse or not horse</h2>
    <p style="margin: 0 0 18px 0; font-size: 0.9rem; opacity: 0.85; font-style: italic; color: #e0f7fa; lowercase">voting matters; so do (you)</p>
    
    <div id="hj-submission-zone" style="margin-bottom: 5px;">
      <div class="hj-clear-capsule">
        <input type="text" id="hj-concept-input" class="hj-input-fluid-override" placeholder="enter a concept to vote horse or not horse..." maxlength="40" autocomplete="off" spellcheck="false" />
        <button id="hj-submit-btn" class="hj-btn-gel">submit</button>
      </div>
      <div id="hj-error-msg" style="color: #ff6666; font-size: 0.85rem; margin: 8px 0 0 16px; display: none; font-style: italic;"></div>
    </div>
    
    <div id="hj-hidden-container" style="margin-top: 12px; display: none; flex-direction: column; gap: 6px; padding: 0 4px;">
      <span style="font-size: 0.8rem; font-weight: bold; opacity: 0.65; lowercase; letter-spacing: 0.5px;">ongoing votes:</span>
      <div id="hj-hidden-items-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto;"></div>
    </div>
    
    <div class="hj-scroll-box">
      <div id="hj-drawer-toggle" class="hj-drawer-bar">
        <span id="hj-drawer-title" style="font-size: 0.95rem; font-weight: bold; opacity: 0.85; lowercase">▶ view settled voting matters</span>
        <span id="hj-drawer-counter" style="font-size: 0.85rem; opacity: 0.6; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 20px;">0</span>
      </div>
      
      <div id="hj-settled-deck" style="display: none; margin-top: 10px;">
        <div class="hj-settled-matrix">
          <div class="hj-matrix-column">
            <div class="hj-matrix-heading" style="color: #bcf533;">🐴 horse</div>
            <div id="hj-matrix-horse-list"></div>
          </div>
          <div class="hj-matrix-column">
            <div class="hj-matrix-heading" style="color: #ff6666;">❌ not horse</div>
            <div id="hj-matrix-nothorse-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(judgementRoot);

  const popdeck = document.createElement("div");
  popdeck.id = "hj-popup-deck";
  document.body.appendChild(popdeck);

  const conceptInput = judgementRoot.querySelector("#hj-concept-input");
  const submitBtn = judgementRoot.querySelector("#hj-submit-btn");
  const errorMsg = judgementRoot.querySelector("#hj-error-msg");
  const settledDeck = judgementRoot.querySelector("#hj-settled-deck");
  const drawerToggle = judgementRoot.querySelector("#hj-drawer-toggle");
  const drawerTitle = judgementRoot.querySelector("#hj-drawer-title");
  const drawerCounter = judgementRoot.querySelector("#hj-drawer-counter");
  const hiddenContainer = judgementRoot.querySelector("#hj-hidden-container");
  const hiddenItemsList = judgementRoot.querySelector("#hj-hidden-items-list");

  let localRegistryItems = [];
  let activeCount = 1;

  drawerToggle.onclick = () => {
    settledOpen = !settledOpen;
    drawerTitle.innerText = settledOpen
      ? "▼ conceal settled voting matters"
      : "▶ view settled voting matters";
    settledDeck.style.display = settledOpen ? "block" : "none";
  };

  const docRef = doc(db, "game_state", "global_clicker");
  const registryQuery = query(collection(db, "horse_judgement"));

  unsubscribe = onSnapshot(registryQuery, (snap) => {
    const dbItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const mergedList = [...BASELINE_LORE].map((base, idx) => {
      const liveMatch = dbItems.find(
        (item) => item.concept.toLowerCase() === base.concept.toLowerCase(),
      );
      return liveMatch
        ? liveMatch
        : { id: `seeded_${idx}`, status: "settled", ...base };
    });

    dbItems.forEach((dbItem) => {
      const alreadyMerged = mergedList.some(
        (m) => m.concept.toLowerCase() === dbItem.concept.toLowerCase(),
      );
      if (!alreadyMerged) mergedList.push(dbItem);
    });

    localRegistryItems = mergedList;

    onSnapshot(docRef, (clickerSnap) => {
      if (clickerSnap.exists()) {
        const data = clickerSnap.data();
        const stompers = data.active_stompers || {};
        const now = Date.now();
        activeCount = 0;
        Object.values(stompers).forEach((time) => {
          if (now - time < 15000) activeCount++;
        });
        activeCount = Math.max(1, activeCount);
      }
      renderRegistry();
    });
  });

  function renderRegistry() {
    let activeHTML = "";
    let settledHorseHTML = "";
    let settledNotHorseHTML = "";
    let hiddenActiveHTML = "";
    let activeUserSlots = 0;
    let settledCount = 0;
    let hasHiddenActive = false;

    localRegistryItems.forEach((item) => {
      if (item.status === "active" && item.creator === safeUser)
        activeUserSlots++;
    });

    if (activeUserSlots >= 3) {
      conceptInput.disabled = true;
      submitBtn.disabled = true;
      conceptInput.placeholder = "active voting slots full (3/3)";
    } else {
      conceptInput.disabled = false;
      submitBtn.disabled = false;
      conceptInput.placeholder = `add your own... (${activeUserSlots}/3 active)`;
    }

    const sortedItems = [...localRegistryItems].sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    );

    sortedItems.forEach((item) => {
      const hStomps = item.horseStomps || 0;
      const nhStomps = item.notHorseStomps || 0;
      const totalCast = hStomps + nhStomps;

      const horseWidth = totalCast > 0 ? (hStomps / totalCast) * 100 : 50;
      const notHorseWidth = totalCast > 0 ? (nhStomps / totalCast) * 100 : 50;

      const delta = Math.abs(hStomps - nhStomps);
      const requiredDelta = Math.max(4, Math.floor(activeCount * 1.5));
      const userVoted = item.voters && item.voters[safeUser];

      if (item.status === "active") {
        if (window.__hjHiddenPopups.has(item.id)) {
          hasHiddenActive = true;
          hiddenActiveHTML += `
            <div class="hj-compact-row" style="margin-bottom: 0; padding: 6px 12px; flex-direction: row; justify-content: space-between; align-items: center; gap: 10px;">
              <span style="font-weight: bold; color: #fff; font-size: 0.85rem; lowercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">${item.concept}</span>
              <button class="hj-btn-gel summon-popup-btn" data-id="${item.id}" style="font-size: 0.65rem; padding: 4px 10px; border-radius: 4px; margin: 0; height: auto; line-height: 1; border-color: rgba(0, 242, 254, 0.45);">results</button>
            </div>
          `;
          return;
        }

        const themeIndex =
          Math.abs(
            item.concept
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0),
          ) % POPUP_THEMES.length;
        const theme = POPUP_THEMES[themeIndex];

        if (!window.__hjPopupPositions[item.id]) {
          window.__hjPopupPositions[item.id] = {
            x: Math.floor(
              Math.random() * (window.innerWidth * 0.4) +
                window.innerWidth * 0.1,
            ),
            y: Math.floor(
              Math.random() * (window.innerHeight * 0.4) +
                window.innerHeight * 0.1,
            ),
            skew: (Math.random() * 6 - 3).toFixed(1) + "deg",
            z: ++window.__highestVistaZIndex,
          };
        }
        const coords = window.__hjPopupPositions[item.id];

        activeHTML += `
          <div class="hj-popup-ad" data-id="${item.id}" style="top: ${coords.y}px; left: ${coords.x}px; transform: rotate(${coords.skew}); z-index: ${coords.z}; background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(${theme.rgb}, 0.08) 50%, rgba(255, 255, 255, 0.02) 100%); border: 2px solid rgba(${theme.rgb}, 0.55); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 6px rgba(255,255,255,0.3), 0 0 15px rgba(${theme.rgb}, 0.2);">
            <div class="hj-ad-banner" style="background: linear-gradient(90deg, rgba(${theme.rgb}, 0.85) 0%, rgba(${theme.rgb2}, 0.6) 100%);">
              <span class="hj-ad-title">${theme.label}</span>
              <span class="hj-close-ad-btn" style="font-size: 0.85rem; font-weight: bold; color: #fff; cursor: pointer; padding: 2px 6px;">[x]</span>
            </div>
            <div class="hj-ad-body">
              <div style="font-size: 1.35rem; font-weight: bold; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); lowercase; margin-bottom: 8px;">${item.concept}</div>
              
              <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #bcf533; font-weight: bold; lowercase; margin-bottom: 3px;">
                    <span>horse</span>
                    <span>${hStomps}</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.4); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                    <div style="width: ${horseWidth}%; height: 100%; background: linear-gradient(90deg, #9ece27, #bcf533); box-shadow: 0 0 10px #9ece27; transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1); position: relative;">
                      <div style="position: absolute; top: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0));"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #ff6666; font-weight: bold; lowercase; margin-bottom: 3px;">
                    <span>not horse</span>
                    <span>${nhStomps}</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.4); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); position: relative; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                    <div style="width: ${notHorseWidth}%; height: 100%; background: linear-gradient(90deg, #ff3232, #ff6666); box-shadow: 0 0 10px #ff3232; transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1); position: relative;">
                      <div style="position: absolute; top: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0));"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style="font-size: 0.75rem; opacity: 0.75; font-style: italic; color: #fff; text-align: center; margin-bottom: 12px; lowercase">
                current delta gap: ${delta} / ${requiredDelta} votes
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="hj-btn-gel stomp-vote-btn" data-id="${item.id}" data-type="horse" ${userVoted ? "disabled" : ""} style="border-color: rgba(158, 206, 39, 0.7); flex-grow: 1;">
                  🐴 horse
                </button>
                <button class="hj-btn-gel stomp-vote-btn" data-id="${item.id}" data-type="nothorse" ${userVoted ? "disabled" : ""} style="border-color: rgba(255, 50, 50, 0.7); flex-grow: 1;">
                  ❌ not horse
                </button>
              </div>
            </div>
          </div>
        `;
      } else {
        settledCount++;
        const finalVerdict = item.verdict === "horse";

        const segmentHTML = `
          <div class="hj-compact-row" title="${item.description || ""}">
            <span style="font-weight: bold; color: #fff; font-size: 0.95rem; lowercase; line-height: 1.2;">${item.concept}</span>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <button class="hj-btn-gel challenge-btn" data-id="${item.id}" style="font-size: 0.65rem; padding: 3px 8px; background: transparent; border-color: rgba(255,255,255,0.25);">🌀 reset</button>
            </div>
          </div>
        `;

        if (finalVerdict) {
          settledHorseHTML += segmentHTML;
        } else {
          settledNotHorseHTML += segmentHTML;
        }
      }
    });

    drawerCounter.innerText = settledCount;
    popdeck.innerHTML = activeHTML;

    if (hasHiddenActive) {
      hiddenContainer.style.display = "flex";
      hiddenItemsList.innerHTML = hiddenActiveHTML;
      hiddenItemsList.querySelectorAll(".summon-popup-btn").forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.id;
          window.__hjHiddenPopups.delete(targetId);

          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(window.__hjHiddenPopups)),
            );
          } catch (err) {}

          window.__highestVistaZIndex++;
          if (window.__hjPopupPositions[targetId]) {
            window.__hjPopupPositions[targetId].z = window.__highestVistaZIndex;
          }
          renderRegistry();
        };
      });
    } else {
      hiddenContainer.style.display = "none";
      hiddenItemsList.innerHTML = "";
    }

    judgementRoot.querySelector("#hj-matrix-horse-list").innerHTML =
      settledHorseHTML ||
      `<div style="font-style: italic; opacity: 0.4; font-size: 0.8rem; padding: 5px; text-align: center;">vacant</div>`;
    judgementRoot.querySelector("#hj-matrix-nothorse-list").innerHTML =
      settledNotHorseHTML ||
      `<div style="font-style: italic; opacity: 0.4; font-size: 0.8rem; padding: 5px; text-align: center;">vacant</div>`;

    popdeck.querySelectorAll(".hj-popup-ad").forEach((popup) => {
      const banner = popup.querySelector(".hj-ad-banner");
      const closeBtn = popup.querySelector(".hj-close-ad-btn");
      const id = popup.dataset.id;

      popup.addEventListener("mousedown", () => {
        window.__highestVistaZIndex++;
        popup.style.zIndex = window.__highestVistaZIndex;
        if (window.__hjPopupPositions[id]) {
          window.__hjPopupPositions[id].z = window.__highestVistaZIndex;
        }
      });

      closeBtn.onclick = (e) => {
        e.stopPropagation();
        window.__hjHiddenPopups.add(id);

        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify(Array.from(window.__hjHiddenPopups)),
          );
        } catch (err) {}

        renderRegistry();
      };

      banner.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("hj-close-ad-btn")) return;
        e.preventDefault();

        const coords = window.__hjPopupPositions[id];
        const initialX = coords.x;
        const initialY = coords.y;

        const startX = e.clientX;
        const startY = e.clientY;

        function onMouseMove(moveEvent) {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          coords.x = initialX + deltaX;
          coords.y = initialY + deltaY;

          popup.style.left = coords.x + "px";
          popup.style.top = coords.y + "px";
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener(
          "mouseup",
          () => {
            document.removeEventListener("mousemove", onMouseMove);
          },
          { once: true },
        );
      });
    });

    popdeck.querySelectorAll(".stomp-vote-btn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.closest(".hj-popup-ad").dataset.id;
        const type = btn.dataset.type;
        const targetRecord = localRegistryItems.find((i) => i.id === id);
        if (
          !targetRecord ||
          (targetRecord.voters && targetRecord.voters[safeUser])
        )
          return;

        if (id.startsWith("seeded_")) {
          await setDoc(doc(db, "horse_judgement", id), {
            concept: targetRecord.concept,
            creator: "system_genesis",
            status: "active",
            description: targetRecord.description || "",
            horseStomps: targetRecord.horseStomps + (type === "horse" ? 1 : 0),
            notHorseStomps:
              targetRecord.notHorseStomps + (type === "nothorse" ? 1 : 0),
            voters: { [safeUser]: true },
            createdAt: Date.now(),
          });
          return;
        }

        const fieldToIncrement =
          type === "horse" ? "horseStomps" : "notHorseStomps";
        const updatedHorseCount =
          (targetRecord.horseStomps || 0) + (type === "horse" ? 1 : 0);
        const updatedNotHorseCount =
          (targetRecord.notHorseStomps || 0) + (type === "nothorse" ? 1 : 0);

        const currentDelta = Math.abs(updatedHorseCount - updatedNotHorseCount);
        const dynamicThreshold = Math.max(4, Math.floor(activeCount * 1.5));

        const finalUpdate = {
          [fieldToIncrement]: increment(1),
          [`voters.${safeUser}`]: true,
        };

        if (currentDelta >= dynamicThreshold) {
          finalUpdate.status = "settled";
          finalUpdate.verdict =
            updatedHorseCount > updatedNotHorseCount ? "horse" : "not horse";
          if (window.__hjPopupPositions[id])
            delete window.__hjPopupPositions[id];

          if (window.__hjHiddenPopups.has(id)) {
            window.__hjHiddenPopups.delete(id);
            try {
              localStorage.setItem(
                storageKey,
                JSON.stringify(Array.from(window.__hjHiddenPopups)),
              );
            } catch (err) {}
          }
        }

        await updateDoc(doc(db, "horse_judgement", id), finalUpdate);
      };
    });

    judgementRoot.querySelectorAll(".challenge-btn").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const targetRecord = localRegistryItems.find((i) => i.id === id);
        if (window.__hjHiddenPopups.has(id)) {
          window.__hjHiddenPopups.delete(id);
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(window.__hjHiddenPopups)),
            );
          } catch (err) {}
        }

        if (id.startsWith("seeded_")) {
          await setDoc(doc(db, "horse_judgement", id), {
            concept: targetRecord.concept,
            creator: "system_genesis",
            status: "active",
            description: targetRecord.description || "",
            horseStomps: 0,
            notHorseStomps: 0,
            voters: {},
            createdAt: Date.now(),
          });
        } else {
          await updateDoc(doc(db, "horse_judgement", id), {
            status: "active",
            verdict: deleteField(),
            horseStomps: 0,
            notHorseStomps: 0,
            voters: {},
          });
        }
      };
    });
  }

  submitBtn.onclick = async () => {
    errorMsg.style.display = "none";
    const rawVal = conceptInput.value;
    if (!rawVal) return;

    const cleanConcept = rawVal.trim().toLowerCase();
    const cleanNormalized = cleanConcept.replace(/[^a-z0-9]/g, "");

    if (cleanNormalized.length < 2) {
      errorMsg.innerText = "the memory demands a more substantial word";
      errorMsg.style.display = "block";
      return;
    }

    const isDuplicate = localRegistryItems.some((item) => {
      const itemNormalized = item.concept
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return itemNormalized === cleanNormalized;
    });

    if (isDuplicate) {
      errorMsg.innerText = "this frequency has already been cataloged";
      errorMsg.style.display = "block";
      return;
    }

    const docId = "concept_" + Date.now();
    await setDoc(doc(db, "horse_judgement", docId), {
      concept: rawVal.trim(),
      creator: safeUser,
      status: "active",
      horseStomps: 0,
      notHorseStomps: 0,
      voters: {},
      createdAt: Date.now(),
    });

    conceptInput.value = "";
  };

  conceptInput.onkeydown = (e) => {
    if (e.key === "Enter") submitBtn.click();
  };
}

export function unmountHorseJudgement() {
  if (unsubscribe) unsubscribe();

  const styleEl = document.getElementById("hj-styles");
  if (styleEl) styleEl.remove();

  const popdeck = document.getElementById("hj-popup-deck");
  if (popdeck) popdeck.remove();

  if (judgementRoot) {
    judgementRoot.remove();
    judgementRoot = null;
  }
}
