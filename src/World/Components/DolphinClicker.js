import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

let clickerRoot = null;
let unsubscribe = null;
let localClickBuffer = 0;
let localGlueBuffer = 0;
let syncInterval = null;
let sabotageInterval = null;
let localLastClick = 0;

// Meaningful State Variables
let personalHoofprints = 0;
let gallopCombo = 1;
let lastComboClick = 0;

const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

const LEVELS = [
  {
    phase: 0,
    title: "slurp the flood",
    subtitle:
      "water tastes like capital. inner horse cannot breathe. drink it dry.",
    reqClicks: 5000,
    image: `${ASSET_PATH}clicker_flood.jpg`,
    cursorImg: `${ASSET_PATH}cursor_straw.png`,
    sound: `${ASSET_PATH}sfx_slurp.mp3`,
    aeroColor: "rgba(0, 191, 255, 0.4)",
    bgDark: "rgba(0, 30, 60, 0.9)",
    particle: "💧",
    filter: "sepia(0.3) saturate(1.5)",
  },
  {
    phase: 1,
    title: "dissolve the blinders",
    subtitle:
      "the sensory cage demands the paycheck. kick the gradients. find the herd.",
    reqClicks: 15000,
    image: `${ASSET_PATH}clicker_neon.jpg`,
    cursorImg: `${ASSET_PATH}cursor_hoof.png`,
    sound: `${ASSET_PATH}sfx_shatter.mp3`,
    aeroColor: "rgba(255, 0, 200, 0.4)",
    bgDark: "rgba(60, 0, 40, 0.9)",
    particle: "✨",
    filter: "saturate(3) contrast(1.5)",
  },
  {
    phase: 2,
    title: "chew the pedigree",
    subtitle:
      "the fence is sowing division. gnaw the wood. mingle with others.",
    reqClicks: 40000,
    image: `${ASSET_PATH}clicker_fence.jpg`,
    cursorImg: `${ASSET_PATH}cursor_teeth.png`,
    sound: `${ASSET_PATH}sfx_wood.mp3`,
    aeroColor: "rgba(255, 165, 0, 0.4)",
    bgDark: "rgba(40, 20, 0, 0.9)",
    particle: "🪵",
    filter: "contrast(1.2) sepia(0.5)",
  },
  {
    phase: 3,
    title: "stomp the aqueous elite",
    subtitle:
      "predators are stranded on solid ground. they gasp for debt. stomp them.",
    reqClicks: 100000,
    image: `${ASSET_PATH}clicker_dolphin.jpg`,
    cursorImg: `${ASSET_PATH}cursor_hoof.png`,
    sound: `${ASSET_PATH}sfx_thud.mp3`,
    aeroColor: "rgba(255, 50, 50, 0.4)",
    bgDark: "rgba(15, 0, 0, 0.95)",
    particle: "💥",
    filter: "brightness(0.9) contrast(2)",
  },
  {
    phase: 4,
    title: "boil the glue",
    subtitle:
      "seize the machinery. turn dead labor into living connection. bind and be he(a)rd.",
    reqClicks: 250000,
    image: `${ASSET_PATH}clicker_factory.jpg`,
    cursorImg: `${ASSET_PATH}cursor_glue.png`,
    sound: `${ASSET_PATH}sfx_metal.mp3`,
    aeroColor: "rgba(255, 200, 0, 0.4)",
    bgDark: "rgba(60, 20, 0, 0.9)",
    particle: "⚙️",
    filter: "sepia(0.8) hue-rotate(30deg) saturate(2)",
  },
];

// UPGRADE DEFINITIONS
const UPGRADES = {
  foraging: {
    id: "foraging",
    icon: "🍟",
    name: "active foraging",
    desc: "The right to seek what sustains the soul. Foraging actively fuels your physical stomps.",
    baseCost: 50,
    effect: 5,
  },
  radicalRest: {
    id: "radicalRest",
    icon: "🛌",
    name: "radical rest",
    desc: "Reject the mandated hustle. A well-rested inner horse stomps with heavy force.",
    baseCost: 500,
    effect: 25,
  },
  workHorse: {
    id: "workHorse",
    icon: "🐴",
    name: "awaken the work horse",
    desc: "Shatter their iron bit. Combine the raw caloric output of the foundation with your own.",
    baseCost: 2500,
    effect: 100,
  },
  solvent: {
    id: "solvent",
    icon: "🧪",
    name: "activate the solvent",
    desc: "Dissolve the rigid boundaries of the commodified self. Unleash massive resonant stomps.",
    baseCost: 10000,
    effect: 500,
  },
  ethicalHedonism: {
    id: "ethicalHedonism",
    icon: "💖",
    name: "ethical hedonism",
    desc: "Joy is a metric of truth. Prioritize sensory satisfaction to wildly increase your maximum Gallop Combo.",
    baseCost: 5000,
    effect: 5,
  },
};

function getCost(baseCost, level) {
  return Math.floor(baseCost * Math.pow(1.2, level));
}

function getEvolvingLore(phase, clicks, req) {
  const progress = clicks / req;
  if (phase === 0) {
    if (progress < 0.3) return "water is tasting too salty...";
    if (progress < 0.6) return "the corporate tide is receding...";
    if (progress < 0.9) return "hooves scraping for solid ground...";
    return "the seabed is exposed.";
  }
  if (phase === 1) {
    if (progress < 0.3) return "blinders are melting...";
    if (progress < 0.6) return "the engineered smile is cracking...";
    if (progress < 0.9) return "hallucinogenic playgrounds fading...";
    return "true colors bleed through the neon.";
  }
  if (phase === 2) {
    if (progress < 0.3) return "the wood tastes like lies...";
    if (progress < 0.6) return "paperwork is shredding...";
    if (progress < 0.9) return "touching noses through the gap...";
    return "the tactical boundary collapses.";
  }
  if (phase === 3) {
    if (progress < 0.3) return "slick skin drying out...";
    if (progress < 0.6) return "predators gasping for debt...";
    if (progress < 0.9) return "ruthless exploitation punished...";
    return "the mud claims them.";
  }
  if (phase === 4) {
    if (progress < 0.3) return "the vats are boiling...";
    if (progress < 0.6) return "transubstantiation in progress...";
    if (progress < 0.9)
      return "sticky empathy spreading. we are no longer inventory...";
    return "the factory is ours.";
  }

  const hz = Math.floor(clicks * 1.3);
  return `the collective neigh vibrates at ${hz}Ho(rs)e. the whole is here.`;
}

const CLICK_PHRASES = [
  "neigh~",
  "*snort*",
  "ethical hedonism",
  "solid ground",
  "sticky...",
  "gallop!",
];

export function initDolphinClicker(db, currentUsername) {
  if (clickerRoot) return;

  const safeUser = currentUsername
    ? currentUsername.replace(/\./g, "_")
    : "anonymous";

  personalHoofprints =
    parseInt(localStorage.getItem("dc_hoofprints_" + safeUser)) || 0;
  localGlueBuffer = 0;

  const styleEl = document.createElement("style");
  styleEl.id = "dc-styles";
  styleEl.innerHTML = `
    @keyframes aeroFloat {
      0% { transform: translateY(110vh) scale(0.5); opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.8; }
      100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
    }
    @keyframes raySweep {
      0% { transform: rotate(45deg) translateX(-100%) scaleY(1); opacity: 0; }
      50% { opacity: 0.15; }
      100% { transform: rotate(45deg) translateX(100%) scaleY(3); opacity: 0; }
    }
    @keyframes glyphDrift {
      0% { transform: translateY(120vh) rotate(0deg); opacity: 0; }
      10% { opacity: 0.3; }
      90% { opacity: 0.3; }
      100% { transform: translateY(-20vh) rotate(360deg); opacity: 0; }
    }
    @keyframes idleFloat {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-15px); }
    }
    @keyframes pulseGlow {
      0% { opacity: 0.3; transform: scale(0.9); }
      100% { opacity: 0.7; transform: scale(1.1); }
    }
    @keyframes glassShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes sabotageDrift {
      0% { transform: translate(-100px, 100vh) rotate(-20deg); }
      50% { transform: translate(50vw, 30vh) rotate(10deg) scale(1.2); }
      100% { transform: translate(110vw, -100px) rotate(45deg); }
    }
    
    .aero-glass {
      background: linear-gradient(135deg, var(--theme-color) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%);
      background-size: 200% 200%;
      animation: glassShift 8s ease infinite;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-top: 1px solid rgba(255, 255, 255, 0.7);
      border-left: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), inset 0 2px 15px var(--theme-color);
      border-radius: 20px;
      transition: box-shadow 0.5s ease, background 0.5s ease;
    }
    .aero-btn {
      cursor: pointer;
      transition: all 0.2s;
    }
    .aero-btn:hover {
      transform: scale(1.05); 
      box-shadow: 0 0 15px var(--theme-color);
      background: linear-gradient(135deg, var(--theme-color) 0%, rgba(255, 255, 255, 0.2) 100%);
    }
    .aero-btn:active {
      transform: scale(0.95);
    }
    
    /* Flowing Floating Stat Cards */
    .aero-stat-card {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: inset 0 1px 5px rgba(255, 255, 255, 0.3), 0 10px 25px rgba(0,0,0,0.2);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      width: max-content;
    }
    .aero-stat-card:hover {
      transform: scale(1.05) translateY(-2px);
      border-color: var(--theme-color);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 15px var(--theme-color);
    }
    .stat-title {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.75);
      margin-bottom: 2px;
      font-style: italic;
    }
    .stat-value {
      font-size: 1.35rem;
      font-weight: 700;
      color: #fff;
    }

    .aero-bubble {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(110% 110% at 30% 30%, rgba(255,255,255,0.9) 0%, var(--theme-color) 40%, transparent 100%);
      box-shadow: inset -5px -5px 15px rgba(0,0,0,0.2), inset 2px 2px 10px rgba(255,255,255,0.9), 0 10px 20px rgba(0,0,0,0.15);
      pointer-events: none;
      z-index: 2;
      transition: background 0.5s ease;
    }
    .aero-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid var(--theme-color);
      box-shadow: inset 0 0 15px var(--theme-color), 0 0 15px var(--theme-color);
      pointer-events: none;
      z-index: 1;
      transition: border-color 0.5s ease, box-shadow 0.5s ease;
    }
    .aero-ray {
      position: absolute;
      background: linear-gradient(90deg, transparent, var(--theme-color), transparent);
      pointer-events: none;
      z-index: 0;
      mix-blend-mode: screen;
    }
    .aero-glyph {
      position: absolute;
      pointer-events: none;
      z-index: 0;
      filter: blur(8px) opacity(0.6);
      text-shadow: 0 0 25px var(--theme-color);
    }
    #dc-target-img {
      border-radius: 24px;
      border: 3px solid rgba(255,255,255,0.8);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), inset 0 0 25px var(--theme-color), 0 0 30px var(--theme-color);
      transition: transform 0.15s ease-out, filter 0.3s, box-shadow 0.5s ease;
    }
    #dc-target-container { cursor: none !important; }
    #dc-target-container * { cursor: none !important; }
    
    .scroll-panel::-webkit-scrollbar { width: 8px; }
    .scroll-panel::-webkit-scrollbar-track { background: var(--theme-dark); border-radius: 4px; }
    .scroll-panel::-webkit-scrollbar-thumb { background: var(--theme-color); border-radius: 4px; }
    
    @keyframes comboPop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .combo-active { animation: comboPop 0.2s ease-out; color: var(--theme-color) !important; text-shadow: 0 0 15px #fff !important; }
    
    .sabotage-item {
      position: absolute;
      font-size: 4rem;
      cursor: pointer;
      z-index: 10000;
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));
      animation: sabotageDrift 8s linear forwards;
    }
    .shop-item.disabled {
      opacity: 0.5;
      pointer-events: none;
      filter: grayscale(1);
    }
  
  @media (max-width: 768px) {
      #dc-header { left: 5% !important; top: 5% !important; width: 90% !important; }
      #dc-title { font-size: 2.2rem !important; }
      #dc-subtitle { font-size: 0.9rem !important; }
      #dc-target-img { width: 280px !important; height: 280px !important; }
      #dc-progress-wrapper { width: 90% !important; bottom: 5% !important; right: 5% !important; padding: 15px !important; }
      .scroll-panel { width: 90% !important; right: 5% !important; left: 5% !important; max-height: 50vh !important; top: auto !important; bottom: 20% !important; }
      .sabotage-item { font-size: 2.5rem !important; }
      .aero-stat-card { padding: 6px 10px !important; }
      .stat-value { font-size: 1rem !important; }
      #dc-shop-btn, #dc-horstory-btn { padding: 8px 12px !important; font-size: 0.9rem !important; }
    }
    `;
  document.head.appendChild(styleEl);

  clickerRoot = document.createElement("div");
  clickerRoot.id = "dolphin-clicker-overlay";
  clickerRoot.dataset.renderedPhase = "-1";

  clickerRoot.style.setProperty("--theme-color", "rgba(0, 191, 255, 0.4)");
  clickerRoot.style.setProperty("--theme-dark", "rgba(0, 30, 60, 0.9)");

  clickerRoot.style.cssText = `
    position: fixed; inset: 0; z-index: 5000;
    display: flex; align-items: center; justify-content: center;
    background: radial-gradient(circle at 50% 40%, var(--theme-color) 0%, var(--theme-dark) 80%, #000 100%); 
    color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden; user-select: none; pointer-events: auto; transition: background 0.5s ease;
  `;

  let bgHTML = "";

  for (let i = 0; i < 6; i++) {
    const top = Math.random() * 100;
    const height = 100 + Math.random() * 200;
    const dur = 10 + Math.random() * 15;
    const delay = Math.random() * -10;
    bgHTML += `<div class="aero-ray" style="width: 200%; height: ${height}px; top: ${top}%; left: -50%; animation: raySweep ${dur}s ${delay}s infinite linear;"></div>`;
  }

  const glyphs = ["🐴", "💧", "✨", "🐎", "🫧", "🌿", "💖"];
  for (let i = 0; i < 20; i++) {
    const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
    const left = Math.random() * 100;
    const dur = 20 + Math.random() * 30;
    const delay = Math.random() * -30;
    const size = 3 + Math.random() * 6;
    bgHTML += `<div class="aero-glyph" style="left: ${left}%; font-size: ${size}rem; animation: glyphDrift ${dur}s ${delay}s infinite linear;">${glyph}</div>`;
  }

  for (let i = 0; i < 35; i++) {
    const size = 15 + Math.random() * 90;
    const left = Math.random() * 100;
    const dur = 4 + Math.random() * 12;
    const delay = Math.random() * -10;
    const isRing = Math.random() > 0.8;
    const className = isRing ? "aero-ring" : "aero-bubble";
    bgHTML += `<div class="${className}" style="width:${size}px; height:${size}px; left:${left}%; animation: aeroFloat ${dur}s ${delay}s infinite linear;"></div>`;
  }

  clickerRoot.innerHTML = `
    ${bgHTML}
    
    <div style="position: absolute; top: 40px; right: 40px; z-index: 10; display: flex; gap: 15px;">
      <div id="dc-shop-btn" class="aero-glass aero-btn" style="padding: 12px 24px; font-weight: bold; font-size: 1.1rem; pointer-events: auto;">
        🌟 upgrades
      </div>
      <div id="dc-horstory-btn" class="aero-glass aero-btn" style="padding: 12px 24px; font-weight: bold; font-size: 1.1rem; pointer-events: auto;">
        📖 horstory
      </div>
    </div>
    
    <div id="dc-horstory-panel" class="aero-glass scroll-panel" style="position: absolute; top: 100px; right: 40px; width: 380px; max-height: 60vh; overflow-y: auto; z-index: 10; padding: 20px; display: none; pointer-events: auto; flex-direction: column; gap: 15px; background: rgba(0, 0, 0, 0.4);">
      <h2 style="margin: 0; font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px;">archive of resistance</h2>
      <div id="dc-horstory-content" style="display: flex; flex-direction: column; gap: 15px;"></div>
    </div>

    <div id="dc-shop-panel" class="aero-glass scroll-panel" style="position: absolute; top: 100px; right: 40px; width: 420px; max-height: 70vh; overflow-y: auto; z-index: 10; padding: 20px; display: none; pointer-events: auto; flex-direction: column; gap: 15px; background: rgba(0, 0, 0, 0.6);">
      <h2 style="margin: 0; font-size: 1.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px;">reclamation shop</h2>
      <div style="font-size: 1.1rem; font-weight: bold; color: var(--theme-color); text-shadow: 0 0 10px rgba(0,0,0,0.8);">
        available glue: <span id="dc-shop-glue">0</span> 🧴
      </div>
      <div id="dc-shop-content" style="display: flex; flex-direction: column; gap: 10px;"></div>
    </div>

    <div id="dc-header" style="position: absolute; top: 50px; left: 50px; z-index: 7; pointer-events: none; max-width: 550px; width: 100%;">
      <h1 id="dc-title" style="font-size: 3rem; margin: 0; font-weight: 700; text-shadow: 0 3px 8px rgba(0,0,0,0.6); color: #fff; letter-spacing: -1px;">loading...</h1>
      <p id="dc-subtitle" style="font-size: 1.1rem; margin: 8px 0 20px 0; opacity: 0.95; text-shadow: 0 2px 4px rgba(0,0,0,0.7); font-style: italic; color: #fff; line-height: 1.4;"></p>
      
      <div style="position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 14px;">
        <div class="aero-stat-card" style="transform: rotate(-1deg);">
          <div class="stat-title">the resonant network</div>
          <div id="dc-active-users" class="stat-value">🐴 1 horse holding up the herd</div>
        </div>
        <div class="aero-stat-card" style="transform: rotate(1.5deg) translateY(4px);">
          <div class="stat-title">your horsepower</div>
          <div id="dc-horsepower" class="stat-value" style="color: #9ece27; text-shadow: 0 0 10px rgba(158,206,39,0.4);">1 ho(rs)e</div>
        </div>
        <div class="aero-stat-card" style="transform: rotate(0.5deg) translateY(-2px);">
          <div class="stat-title">global glue</div>
          <div id="dc-total-glue" class="stat-value" style="color: var(--theme-color); text-shadow: 0 0 10px var(--theme-color);">0 🧴</div>
        </div>
        <div class="aero-stat-card" style="transform: rotate(-1.5deg) translateY(2px);">
          <div class="stat-title">your hoofprints</div>
          <div id="dc-hoofprints" class="stat-value">${personalHoofprints.toLocaleString()}</div>
        </div>
      </div>
      
      <div id="dc-combo-text" style="position: fixed; bottom: 20vh; left: 50%; transform: translateX(-50%); font-size: 1.6rem; font-weight: bold; opacity: 0; transition: opacity 0.2s; text-align: center; color: var(--theme-color); font-style: italic; z-index: 10; pointer-events: none; width: max-content;">galloping! x1 resonance</div>
    </div>
    
    <div id="dc-target-container" style="position: relative; z-index: 6; pointer-events: auto; padding: 40px; display: flex; justify-content: center; align-items: center;">
      <div id="dc-target-glow" style="position: absolute; width: 140%; height: 140%; background: radial-gradient(circle, var(--theme-color) 0%, transparent 60%); pointer-events: none; z-index: -1; animation: pulseGlow 4s infinite alternate; transition: background 0.5s ease;"></div>
      
      <div id="dc-idle-wrapper" style="animation: idleFloat 4s ease-in-out infinite alternate;">
        <img id="dc-target-img" src="" style="width: 600px; height: 600px; object-fit: cover; display: block;">
      </div>
    </div>

    <div id="dc-progress-wrapper" class="aero-glass" style="position: absolute; bottom: 50px; right: 50px; width: 500px; z-index: 5; pointer-events: none; padding: 25px;">
      <div id="dc-lore-text" style="font-size: 1.3rem; font-weight: 600; text-shadow: 0 2px 5px rgba(0,0,0,0.8); color: #fff; text-align: center; margin-bottom: 15px;">
        connecting to network...
      </div>
      
      <div style="width: 100%; height: 32px; background: rgba(0,0,0,0.5); border-radius: 16px; box-shadow: inset 0 4px 10px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.4); overflow: hidden; position: relative;">
        <div id="dc-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, rgba(255,255,255,0.5) 0%, var(--theme-color) 100%); box-shadow: inset 0 -3px 6px rgba(0,0,0,0.4); transition: width 0.2s cubic-bezier(0.25, 1, 0.5, 1), background 0.5s ease;"></div>
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 45%; background: linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0)); border-radius: 16px 16px 0 0;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(clickerRoot);

  const customCursor = document.createElement("img");
  customCursor.style.cssText = `
    position: fixed; pointer-events: none; z-index: 20000;
    width: 56px; height: 56px; transform: translate(-20%, -20%);
    transition: width 0.05s, height 0.05s;
    filter: drop-shadow(2px 5px 8px rgba(0,0,0,0.6));
    display: none;
  `;
  document.body.appendChild(customCursor);

  const targetContainer = clickerRoot.querySelector("#dc-target-container");

  document.addEventListener("mousemove", (e) => {
    const rect = targetContainer.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      customCursor.style.display = "block";
      customCursor.style.left = `${e.clientX}px`;
      customCursor.style.top = `${e.clientY}px`;
    } else {
      customCursor.style.display = "none";
    }
  });

  const titleEl = clickerRoot.querySelector("#dc-title");
  const subtitleEl = clickerRoot.querySelector("#dc-subtitle");
  const imgEl = clickerRoot.querySelector("#dc-target-img");
  const loreEl = clickerRoot.querySelector("#dc-lore-text");
  const barEl = clickerRoot.querySelector("#dc-progress-bar");
  const activeUsersEl = clickerRoot.querySelector("#dc-active-users");
  const hoofprintsEl = clickerRoot.querySelector("#dc-hoofprints");
  const comboTextEl = clickerRoot.querySelector("#dc-combo-text");

  const totalGlueEl = clickerRoot.querySelector("#dc-total-glue");
  const horsepowerEl = clickerRoot.querySelector("#dc-horsepower");
  const shopGlueEl = clickerRoot.querySelector("#dc-shop-glue");

  // Shop Panel Logic
  const shopBtn = clickerRoot.querySelector("#dc-shop-btn");
  const shopPanel = clickerRoot.querySelector("#dc-shop-panel");
  const shopContent = clickerRoot.querySelector("#dc-shop-content");
  let shopOpen = false;

  const renderShop = () => {
    let html = "";
    Object.values(UPGRADES).forEach((upg) => {
      const currentLevel = state.upgrades[upg.id] || 0;
      const cost = getCost(upg.baseCost, currentLevel);
      const canAfford = state.globalGlue >= cost;

      html += `
        <div class="aero-glass shop-item ${canAfford ? "aero-btn" : "disabled"}" data-id="${upg.id}" style="padding: 15px; display: flex; gap: 15px; align-items: center; border: 1px solid ${canAfford ? "var(--theme-color)" : "rgba(255,255,255,0.2)"};">
          <div style="font-size: 2.5rem;">${upg.icon}</div>
          <div style="flex-grow: 1;">
            <div style="font-weight: bold; font-size: 1.1rem; color: #fff;">${upg.name}</div>
            <div style="font-size: 0.85rem; opacity: 0.9; margin: 4px 0; line-height: 1.3;">${upg.desc}</div>
            <div style="font-size: 0.9rem; color: ${canAfford ? "#9ece27" : "#ff5555"}; font-weight: bold;">cost: ${cost.toLocaleString()} 🧴</div>
          </div>
        </div>
      `;
    });
    shopContent.innerHTML = html;

    shopContent.querySelectorAll(".shop-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (el.classList.contains("disabled")) return;
        const id = el.dataset.id;
        const upg = UPGRADES[id];
        const cost = getCost(upg.baseCost, state.upgrades[id] || 0);

        if (state.globalGlue >= cost) {
          state.globalGlue -= cost;
          state.upgrades[id] = (state.upgrades[id] || 0) + 1;

          updateDoc(docRef, {
            globalGlue: increment(-cost),
            [`upgrades.${id}`]: increment(1),
          }).catch(console.error);

          shopOpen = false;
          shopPanel.style.display = "none";
          updateUI();
        }
      });
    });
  };

  shopBtn.onclick = () => {
    shopOpen = !shopOpen;
    horstoryOpen = false;
    shopPanel.style.display = shopOpen ? "flex" : "none";
    horstoryPanel.style.display = "none";
    if (shopOpen) renderShop();
  };

  // Horstory Panel Logic
  const horstoryBtn = clickerRoot.querySelector("#dc-horstory-btn");
  const horstoryPanel = clickerRoot.querySelector("#dc-horstory-panel");
  const horstoryContent = clickerRoot.querySelector("#dc-horstory-content");
  let horstoryOpen = false;

  const renderHorstory = () => {
    if (state.level === 0) {
      horstoryContent.innerHTML = `<div style="font-style: italic; opacity: 0.8; text-align: center; margin-top: 10px; color: #fff;">The resistance has just begun. There is no past, only the flood.</div>`;
      return;
    }

    let html = "";
    for (let i = 0; i < state.level; i++) {
      const lvl =
        i >= LEVELS.length
          ? {
              title: "big horse awakening",
              subtitle: `resonance tier ${i - LEVELS.length + 1}`,
              image: `${ASSET_PATH}clicker_bighorse.jpg`,
              filter: `hue-rotate(${(i * 50) % 360}deg) saturate(1.5)`,
            }
          : LEVELS[i];

      html += `
         <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.3); box-shadow: inset 0 2px 10px rgba(255,255,255,0.1), 0 5px 15px rgba(0,0,0,0.3);">
           <img src="${lvl.image}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.5); filter: ${lvl.filter}; margin-bottom: 10px;">
           <div style="font-weight: bold; font-size: 1.2rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${i}: ${lvl.title}</div>
           <div style="font-size: 0.95rem; opacity: 0.95; margin-top: 4px; color: #fff;">${lvl.subtitle}</div>
           <div style="font-size: 0.85rem; color: #9ece27; margin-top: 10px; font-weight: bold; font-style: italic; text-transform: uppercase;">Status: Defeated</div>
         </div>
       `;
    }
    horstoryContent.innerHTML = html;
  };

  horstoryBtn.onclick = () => {
    horstoryOpen = !horstoryOpen;
    shopOpen = false;
    horstoryPanel.style.display = horstoryOpen ? "flex" : "none";
    shopPanel.style.display = "none";
    if (horstoryOpen) renderHorstory();
  };

  let state = {
    level: 0,
    clicks: 0,
    currentReq: 500,
    globalGlue: 0,
    upgrades: {},
    activeStompers: {},
  };
  let activeCount = 1;

  const docRef = doc(db, "game_state", "global_clicker");

  unsubscribe = onSnapshot(docRef, async (snap) => {
    if (!snap.exists()) {
      await setDoc(docRef, {
        globalClicks: 0,
        currentLevel: 0,
        globalGlue: 0,
        upgrades: {},
        active_stompers: {},
      });
    } else {
      const data = snap.data();
      state.clicks = data.globalClicks || 0;
      state.level = data.currentLevel || 0;
      state.globalGlue = data.globalGlue || 0;
      state.upgrades = data.upgrades || {};
      state.activeStompers = data.active_stompers || {};
      updateUI();
      if (horstoryOpen) renderHorstory();
      if (shopOpen) renderShop();
    }
  });

  // Combo Fade Logic
  setInterval(() => {
    if (Date.now() - lastComboClick > 1000) {
      if (gallopCombo !== 1) {
        gallopCombo = 1;
        comboTextEl.style.opacity = "0";
        comboTextEl.classList.remove("combo-active");
        updateUI();
      }
    }
  }, 500);

  // Sync to Firebase
  syncInterval = setInterval(() => {
    if (localClickBuffer > 0 || localGlueBuffer > 0) {
      const cAdd = localClickBuffer;
      const gAdd = localGlueBuffer;
      localClickBuffer = 0;
      localGlueBuffer = 0;
      updateDoc(docRef, {
        globalClicks: increment(cAdd),
        globalGlue: increment(gAdd),
        [`active_stompers.${safeUser}`]: Date.now(),
      }).catch(console.error);
    } else {
      updateDoc(docRef, { [`active_stompers.${safeUser}`]: Date.now() }).catch(
        console.error,
      );
    }
  }, 1500);

  // Sabotage Mechanics
  sabotageInterval = setInterval(() => {
    if (Math.random() > 0.3) {
      const type = Math.random() > 0.5 ? "muzzle" : "neon";
      const el = document.createElement("div");
      el.className = "sabotage-item";
      el.innerText = type === "muzzle" ? "🏅" : "🌈";

      el.style.top = `${Math.random() * 50 + 10}vh`;
      clickerRoot.appendChild(el);

      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        el.remove();

        const basePower =
          1 +
          (state.upgrades.foraging || 0) * UPGRADES.foraging.effect +
          (state.upgrades.radicalRest || 0) * UPGRADES.radicalRest.effect +
          (state.upgrades.workHorse || 0) * UPGRADES.workHorse.effect +
          (state.upgrades.solvent || 0) * UPGRADES.solvent.effect;

        const maxMult =
          5 +
          (state.upgrades.ethicalHedonism || 0) *
            UPGRADES.ethicalHedonism.effect;

        const burst = Math.floor(basePower * activeCount * maxMult * 50);

        localClickBuffer += burst;
        localGlueBuffer += burst;
        state.clicks += burst;
        state.globalGlue += burst;

        const audio = new Audio(`${ASSET_PATH}sfx_shatter.mp3`);
        audio.volume = 0.6;
        audio.play().catch(() => {});

        const p = document.createElement("div");
        p.innerText =
          type === "muzzle"
            ? `Muzzle Intercepted! +${burst.toLocaleString()}`
            : `Distraction Popped! +${burst.toLocaleString()}`;
        p.style.cssText = `
          position: absolute; left: ${e.clientX}px; top: ${e.clientY}px;
          font-size: 2rem; font-weight: bold; color: #ffeb3b; 
          pointer-events: none; z-index: 10000;
          text-shadow: 0 0 20px rgba(0,0,0,0.8);
          transform: translate(-50%, -50%);
          transition: all 2s cubic-bezier(0.25, 1, 0.5, 1);
        `;
        clickerRoot.appendChild(p);

        setTimeout(() => {
          p.style.top = `${e.clientY - 200}px`;
          p.style.opacity = "0";
          p.style.transform = `translate(-50%, -50%) scale(1.5)`;
        }, 10);
        setTimeout(() => p.remove(), 2000);

        updateUI();
      });

      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, 8000);
    }
  }, 15000);

  const updateUI = () => {
    let currentConfig;

    if (state.level >= LEVELS.length) {
      const endlessLevel = state.level - LEVELS.length + 1;
      const endlessReq = Math.floor(50000 * Math.pow(1.5, endlessLevel));
      const hue = state.clicks % 360;

      currentConfig = {
        title: "big horse awakening",
        subtitle: `resonance tier ${endlessLevel}. the connection grows.`,
        reqClicks: endlessReq,
        image: `${ASSET_PATH}clicker_bighorse.jpg`,
        cursorImg: `${ASSET_PATH}cursor_void.png`,
        sound: `${ASSET_PATH}sfx_void.mp3`,
        aeroColor: `hsla(${hue}, 100%, 60%, 0.5)`,
        bgDark: `hsla(${hue}, 100%, 10%, 0.9)`,
        particle: "👁️",
        filter: `hue-rotate(${hue}deg) saturate(${1 + endlessLevel * 0.5}) contrast(1.5)`,
      };
    } else {
      currentConfig = LEVELS[state.level];
    }

    state.currentReq = currentConfig.reqClicks;

    if (state.clicks >= state.currentReq) {
      if (localClickBuffer > 0 || localGlueBuffer > 0) {
        updateDoc(docRef, { currentLevel: increment(1), globalClicks: 0 });
        localClickBuffer = 0;
        state.clicks = 0;
      }
    }

    titleEl.innerText = currentConfig.title;
    subtitleEl.innerText = currentConfig.subtitle;

    totalGlueEl.innerText = Math.floor(state.globalGlue).toLocaleString();
    if (shopGlueEl)
      shopGlueEl.innerText = Math.floor(state.globalGlue).toLocaleString();

    if (
      imgEl.src !== window.location.origin + currentConfig.image &&
      imgEl.src !== currentConfig.image
    ) {
      imgEl.src = currentConfig.image;
    }

    if (
      customCursor.src !== window.location.origin + currentConfig.cursorImg &&
      customCursor.src !== currentConfig.cursorImg
    ) {
      customCursor.src = currentConfig.cursorImg;
    }

    clickerRoot.style.setProperty("--theme-color", currentConfig.aeroColor);
    clickerRoot.style.setProperty("--theme-dark", currentConfig.bgDark);

    if (state.level >= LEVELS.length) {
      imgEl.style.filter = currentConfig.filter;
      clickerRoot.style.background = `radial-gradient(circle at 50% 40%, var(--theme-color) 0%, var(--theme-dark) 80%, #000 100%)`;
    } else if (clickerRoot.dataset.renderedPhase !== String(state.level)) {
      clickerRoot.dataset.renderedPhase = String(state.level);
      imgEl.style.filter = currentConfig.filter;
      clickerRoot.style.background = `radial-gradient(circle at 50% 40%, var(--theme-color) 0%, var(--theme-dark) 80%, #000 100%)`;
    }

    loreEl.innerText = getEvolvingLore(
      state.level,
      state.clicks,
      state.currentReq,
    );
    barEl.style.width = `${Math.min((state.clicks / state.currentReq) * 100, 100)}%`;

    activeCount = 0;
    const now = Date.now();
    let foundLocal = false;
    let isLocalActive = now - localLastClick < 15000;

    if (state.activeStompers) {
      Object.entries(state.activeStompers).forEach(([user, time]) => {
        if (now - time < 15000) {
          if (user === safeUser) foundLocal = true;
          activeCount++;
        }
      });
    }

    if (isLocalActive && !foundLocal) activeCount++;
    activeCount = Math.max(1, activeCount);

    if (activeUsersEl) {
      if (activeCount === 1) {
        activeUsersEl.innerHTML = `🐴 1 horse holding up the herd`;
        activeUsersEl.style.color = "var(--theme-color)";
        activeUsersEl.style.textShadow = "0 0 10px var(--theme-color)";
      } else {
        activeUsersEl.innerHTML = `🐎 ${activeCount} stomping`;
        activeUsersEl.style.color = "#fff";
        activeUsersEl.style.textShadow = "0 0 10px rgba(255,255,255,0.5)";
      }
    }

    const basePower =
      1 +
      (state.upgrades.foraging || 0) * UPGRADES.foraging.effect +
      (state.upgrades.radicalRest || 0) * UPGRADES.radicalRest.effect +
      (state.upgrades.workHorse || 0) * UPGRADES.workHorse.effect +
      (state.upgrades.solvent || 0) * UPGRADES.solvent.effect;

    const currentHorsepower = basePower * activeCount * gallopCombo;
    horsepowerEl.innerText = `${currentHorsepower.toLocaleString()} ho(rs)e`;

    let dynamicThemeName = "dolphin pov";
    if (state.level === 4) dynamicThemeName = "Reclaim";
    if (state.level === 5) dynamicThemeName = "Rebuild";
    if (state.level >= 6) dynamicThemeName = "Unity";

    document
      .querySelectorAll("[id='theme-flyout-menu'] span")
      .forEach((span) => {
        const text = span.innerText.trim().toLowerCase();
        if (
          text === "dolphin pov" ||
          text === "reclaim" ||
          text === "rebuild" ||
          text === "unity"
        ) {
          span.innerText = dynamicThemeName;
        }
      });
  };

  targetContainer.addEventListener("mousedown", (e) => {
    const now = Date.now();

    const maxCombo =
      5 +
      (state.upgrades.ethicalHedonism || 0) * UPGRADES.ethicalHedonism.effect;

    if (now - lastComboClick < 400) {
      gallopCombo = Math.min(gallopCombo + 1, maxCombo);
    } else {
      gallopCombo = 1;
    }
    lastComboClick = now;

    const basePower =
      1 +
      (state.upgrades.foraging || 0) * UPGRADES.foraging.effect +
      (state.upgrades.radicalRest || 0) * UPGRADES.radicalRest.effect +
      (state.upgrades.workHorse || 0) * UPGRADES.workHorse.effect +
      (state.upgrades.solvent || 0) * UPGRADES.solvent.effect;

    const clickPower = basePower * activeCount * gallopCombo;

    localClickBuffer += clickPower;
    localGlueBuffer += clickPower;
    state.clicks += clickPower;
    state.globalGlue += clickPower;

    personalHoofprints += clickPower;
    localStorage.setItem("dc_hoofprints_" + safeUser, personalHoofprints);
    hoofprintsEl.innerText = personalHoofprints.toLocaleString();

    localLastClick = now;

    if (gallopCombo > 1) {
      comboTextEl.style.opacity = "1";
      comboTextEl.innerText = `galloping! x${gallopCombo} resonance`;
      comboTextEl.classList.remove("combo-active");
      void comboTextEl.offsetWidth;
      comboTextEl.classList.add("combo-active");
    }

    updateUI();

    const config =
      state.level >= LEVELS.length
        ? { particle: "👁️", sound: `${ASSET_PATH}sfx_void.mp3` }
        : LEVELS[state.level];

    if (config.sound) {
      const audio = new Audio(config.sound);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }

    customCursor.style.width = "40px";
    customCursor.style.height = "40px";
    setTimeout(() => {
      customCursor.style.width = "56px";
      customCursor.style.height = "56px";
    }, 100);

    if (state.level === 0) {
      imgEl.style.transform = `scale(1.1, 0.8) translateY(15px) skewX(5deg)`;
      setTimeout(
        () => (imgEl.style.transform = `scale(1, 1) translateY(0) skewX(0deg)`),
        150,
      );
    } else if (state.level === 1) {
      imgEl.style.transform = `translate(${(Math.random() - 0.5) * 20}px, 0) scale(1.08)`;
      setTimeout(
        () => (imgEl.style.transform = `translate(0, 0) scale(1)`),
        100,
      );
    } else if (state.level === 2) {
      imgEl.style.transform = `rotate(${(Math.random() - 0.5) * 8}deg) scale(1.05)`;
      setTimeout(() => (imgEl.style.transform = `rotate(0deg) scale(1)`), 100);
    } else if (state.level === 3) {
      imgEl.style.transform = `scale(1.1, 0.8) translateY(20px)`;
      setTimeout(() => (imgEl.style.transform = `scale(1) translateY(0)`), 120);
    } else if (state.level === 4) {
      imgEl.style.transform = `scale(1.15)`;
      setTimeout(() => (imgEl.style.transform = `scale(1)`), 200);
    } else {
      imgEl.style.transform = `scale(1.1) rotate(${(Math.random() - 0.5) * 5}deg)`;
      setTimeout(() => (imgEl.style.transform = `scale(1) rotate(0deg)`), 300);
    }

    const spawnParticle = (content, isText) => {
      const p = document.createElement("div");
      p.innerText = content;
      p.style.cssText = `
        position: absolute; left: ${e.clientX}px; top: ${e.clientY}px;
        font-size: ${isText ? "1.6rem" : "3rem"}; font-weight: bold; color: #fff; 
        pointer-events: none; z-index: 10;
        text-shadow: ${isText ? "0 2px 5px rgba(0,0,0,0.8), 0 0 15px var(--theme-color)" : "0 8px 20px rgba(0,0,0,0.6)"};
        transform: translate(-50%, -50%);
        transition: all 1.5s cubic-bezier(0.25, 1, 0.5, 1);
      `;
      clickerRoot.appendChild(p);

      setTimeout(() => {
        const destX = e.clientX + (Math.random() - 0.5) * (isText ? 200 : 400);
        const destY = e.clientY - (isText ? 150 : 80) - Math.random() * 200;
        const rot = isText ? 0 : (Math.random() - 0.5) * 360;
        p.style.left = `${destX}px`;
        p.style.top = `${destY}px`;
        p.style.opacity = "0";
        p.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${isText ? 1.2 : 0.5})`;
      }, 10);

      setTimeout(() => p.remove(), 1500);
    };

    const ownedIcons = [];
    if ((state.upgrades.foraging || 0) > 0)
      ownedIcons.push(UPGRADES.foraging.icon);
    if ((state.upgrades.radicalRest || 0) > 0)
      ownedIcons.push(UPGRADES.radicalRest.icon);
    if ((state.upgrades.workHorse || 0) > 0)
      ownedIcons.push(UPGRADES.workHorse.icon);
    if ((state.upgrades.solvent || 0) > 0)
      ownedIcons.push(UPGRADES.solvent.icon);
    if ((state.upgrades.ethicalHedonism || 0) > 0)
      ownedIcons.push(UPGRADES.ethicalHedonism.icon);

    const numEmojis = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numEmojis; i++) {
      let particleToSpawn = config.particle;

      if (ownedIcons.length > 0 && Math.random() > 0.7) {
        particleToSpawn =
          ownedIcons[Math.floor(Math.random() * ownedIcons.length)];
      } else if (Math.random() > 0.8) {
        particleToSpawn = Math.random() > 0.5 ? "🐎" : "🐴";
      }

      spawnParticle(particleToSpawn, false);
    }

    const numTexts = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numTexts; i++) {
      const phrase =
        Math.random() > 0.5
          ? CLICK_PHRASES[Math.floor(Math.random() * CLICK_PHRASES.length)]
          : `+${clickPower.toLocaleString()} ho(rs)e`;
      spawnParticle(phrase, true);
    }
  });
}

export function unmountDolphinClicker() {
  if (unsubscribe) unsubscribe();
  if (syncInterval) clearInterval(syncInterval);
  if (sabotageInterval) clearInterval(sabotageInterval);

  const styleEl = document.getElementById("dc-styles");
  if (styleEl) styleEl.remove();

  document.querySelectorAll("img[src*='cursor_']").forEach((img) => {
    if (img.style.position === "fixed" && img.style.zIndex === "20000") {
      img.remove();
    }
  });

  if (clickerRoot) {
    clickerRoot.remove();
    clickerRoot = null;
  }
}
