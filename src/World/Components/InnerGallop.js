import { doc, updateDoc, increment } from "firebase/firestore";

let rhythmRoot = null;
let audioCtx = null;
let gameLoopId = null;
let beatIntervalId = null;

// Operational State Tracks
let streak = 0;
let blinderPressure = 0;
let activeNotes = [];
let lineOfFlightActive = false;
let lineOfFlightTimer = 0;

// Mode Controls & Continuous Pause State Tracks
let currentMode = "gallop"; // Persists the underlying action track ("gallop" or "meditate")
let isPaused = true; // Controls whether system physics and tickers are frozen
let pauseStarted = Date.now();
let meditationClock = 0;
let lastThoughtIndex = -1;

// Coordinates for the standalone window frame
let windowPos = { x: 120, y: 150 };

const HORSE_THOUGHTS = [
  "we are horse, connection in the marrow",
  "feel the vibrational resonance of the herd",
  "the ground is solid beneath our hooves",
  "dissolve the blinders, reclaim the whole",
  "pleasure is the primary metric of truth",
  "move in a way that collapses all distance",
];

export function initInnerGallop() {
  if (rhythmRoot) return;

  const styleEl = document.createElement("style");
  styleEl.id = "ig-styles";
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
    
    .ig-window-frame {
      position: fixed;
      width: 360px;
      height: 370px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(0, 242, 254, 0.08) 50%, rgba(255, 255, 255, 0.02) 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 2px solid rgba(0, 242, 254, 0.45);
      border-radius: 16px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 6px rgba(255,255,255,0.3);
      pointer-events: auto;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .ig-window-banner {
      background: linear-gradient(90deg, rgba(0, 242, 254, 0.8) 0%, rgba(79, 172, 254, 0.6) 100%);
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.25);
      cursor: grab;
      flex-shrink: 0;
    }
    .ig-window-banner:active { cursor: grabbing; }
    
    .ig-window-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    
    .ig-window-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      flex-grow: 1;
      justify-content: space-between;
    }
    
    .ig-track-zone {
      position: relative;
      width: 160px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .ig-compass-node {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 3px solid rgba(0, 242, 254, 0.8);
      background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(0, 242, 254, 0.2) 70%);
      box-shadow: 0 0 25px rgba(0, 242, 254, 0.6);
      z-index: 10;
      transition: transform 0.05s ease-out;
    }
    
    .ig-frequency-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.4);
      box-shadow: inset 0 0 10px rgba(255,255,255,0.1);
      transform: scale(1);
      pointer-events: none;
    }
    
    .ig-blinder-vignette {
      position: fixed;
      inset: 0;
      z-index: 4100;
      pointer-events: none;
      box-shadow: inset 0 0 calc(var(--blinder-strength, 0px) * 2.5) rgba(0,0,0,0.95);
      transition: box-shadow 0.2s ease;
    }
    
    .ig-hit-flash {
      position: absolute;
      font-size: 1.1rem;
      font-weight: bold;
      color: #bcf533;
      text-shadow: 0 0 10px #9ece27, 0 2px 4px rgba(0,0,0,0.8);
      animation: flashUp 0.6s forwards ease-out;
    }
    
    .ig-mode-icon-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.3);
      background: linear-gradient(to bottom, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.3);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .ig-mode-icon-btn:hover {
      transform: translateY(-2px);
      border-color: #00f2fe;
      box-shadow: 0 6px 14px rgba(0,0,0,0.25), 0 0 8px rgba(0, 242, 254, 0.3);
    }
    .ig-mode-icon-btn.active {
      background: linear-gradient(to bottom, rgba(0, 242, 254, 0.35), rgba(0, 242, 254, 0.1));
      border-color: #00f2fe;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 12px #00f2fe;
    }
    
    .ig-dock-capsule {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 20px;
      border-radius: 50px;
      border: 1px solid rgba(0, 242, 254, 0.5);
      background: rgba(0, 15, 25, 0.85);
      backdrop-filter: blur(12px);
      z-index: 4400;
      cursor: pointer;
      display: none;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4), 0 0 15px rgba(0, 242, 254, 0.2);
    }
    .ig-dock-capsule:hover {
      border-color: #bcf533;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4), 0 0 15px #bcf533;
    }
    @keyframes flashUp {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-40px) scale(1.2); }
    }
  `;
  document.head.appendChild(styleEl);

  rhythmRoot = document.createElement("div");
  rhythmRoot.id = "inner-gallop-root";
  rhythmRoot.innerHTML = `
    <div class="ig-blinder-vignette" style="--blinder-strength: 0px;"></div>
    
    <div id="ig-taskbar-dock" class="ig-dock-capsule">
      <span>🌿 inner horse resting</span>
      <span style="font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 20px; font-weight: bold; color: #00f2fe;">restore</span>
    </div>

    <div id="ig-window" class="ig-window-frame vista-window" style="top: ${windowPos.y}px; left: ${windowPos.x}px;">
      <div class="ig-window-banner">
        <span class="ig-window-title">🐴 inner horse synchronization</span>
        <span id="ig-minimize-btn" style="font-size: 0.9rem; font-weight: bold; color: #fff; cursor: pointer; padding: 2px 6px; user-select: none;">[ - ]</span>
      </div>
      
      <div class="ig-window-body">
        <div class="ig-track-zone">
          <div id="ig-target" class="ig-compass-node"></div>
          <div id="ig-flash-deck" style="position: absolute; inset: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;"></div>
        </div>
        
        <div style="width: 100%; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem; font-weight: bold; color: #fff; lowercase;">alignment status:</span>
            <span id="ig-alignment-state" style="font-weight: bold; color: #00f2fe; font-size: 0.9rem; lowercase;">resting</span>
          </div>
          
          <div id="ig-status-lore" style="font-size: 0.78rem; color: rgba(255,255,255,0.65); font-style: italic; lowercase; line-height: 1.3; min-height: 34px; text-align: center;">
            inner horse currently resting in the stable. select a frequency track below.
          </div>
          
          <div style="width: 100%; height: 4px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden; margin-top: 2px;">
            <div id="ig-streak-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00f2fe, #bcf533); transition: width 0.1s;"></div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; margin-top: 2px;">
          <button id="ig-icn-gallop" class="ig-mode-icon-btn" title="gallop rhythm mode">🐎</button>
          <button id="ig-icn-meditate" class="ig-mode-icon-btn" title="breathing meditation mode">🌿</button>
          <button id="ig-icn-pause" class="ig-mode-icon-btn active" title="pause track">⏸️</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(rhythmRoot);

  const alignmentState = rhythmRoot.querySelector("#ig-alignment-state");
  const statusLore = rhythmRoot.querySelector("#ig-status-lore");
  const streakBar = rhythmRoot.querySelector("#ig-streak-bar");
  const vignette = rhythmRoot.querySelector(".ig-blinder-vignette");
  const targetNode = rhythmRoot.querySelector("#ig-target");
  const flashDeck = rhythmRoot.querySelector("#ig-flash-deck");
  const trackZone = rhythmRoot.querySelector(".ig-track-zone");
  const windowContainer = rhythmRoot.querySelector("#ig-window");
  const taskbarDock = rhythmRoot.querySelector("#ig-taskbar-dock");

  const icnGallop = rhythmRoot.querySelector("#ig-icn-gallop");
  const icnMeditate = rhythmRoot.querySelector("#ig-icn-meditate");
  const icnPause = rhythmRoot.querySelector("#ig-icn-pause");
  const minimizeBtn = rhythmRoot.querySelector("#ig-minimize-btn");

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playHoofbeatTone(freq, duration, type = "sine") {
    if (!audioCtx || audioCtx.state === "suspended") return;
    try {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + duration,
      );
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  const bpm = 92;
  const beatDuration = 60000 / bpm;

  beatIntervalId = setInterval(() => {
    // Blocks ring production completely while paused
    if (currentMode !== "gallop" || isPaused) return;
    playHoofbeatTone(55, 0.2, "triangle");
    activeNotes.push({
      spawnTime: Date.now(),
      targetTime: Date.now() + 120000 / bpm,
      processed: false,
    });
  }, beatDuration);

  function triggerUIVisualFlash(text, isPerfect = true) {
    const el = document.createElement("div");
    el.className = "ig-hit-flash";
    el.innerText = text;
    if (!isPerfect) el.style.color = "#ff6666";
    flashDeck.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  window.addEventListener("keydown", handleStrikeInput);
  trackZone.addEventListener("mousedown", handleStrikeInput);

  function handleStrikeInput(e) {
    if (currentMode !== "gallop" || isPaused) return;
    if (e.type === "keydown" && e.key !== " " && e.code !== "Space") return;

    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

    const now = Date.now();
    let evaluationFound = false;

    for (let i = 0; i < activeNotes.length; i++) {
      const note = activeNotes[i];
      if (note.processed) continue;

      const windowDiff = Math.abs(now - note.targetTime);

      if (windowDiff < 150) {
        note.processed = true;
        evaluationFound = true;

        targetNode.style.transform = "scale(0.82)";
        setTimeout(() => (targetNode.style.transform = "scale(1)"), 60);

        if (windowDiff < 65) {
          streak++;
          blinderPressure = Math.max(0, blinderPressure - 10);
          playHoofbeatTone(196, 0.08);
          triggerUIVisualFlash("perfect timing");
        } else {
          streak++;
          blinderPressure = Math.max(0, blinderPressure - 4);
          playHoofbeatTone(147, 0.06);
          triggerUIVisualFlash("connected");
        }
        break;
      }
    }

    if (!evaluationFound && activeNotes.length > 0) {
      streak = 0;
      blinderPressure = Math.min(100, blinderPressure + 6);
      playHoofbeatTone(80, 0.12, "sawtooth");
      triggerUIVisualFlash("stumbled", false);
    }
    updateTelemetryUI();
  }

  function updateTelemetryUI() {
    if (isPaused) {
      alignmentState.innerText = "paused";
      statusLore.innerText = `synchronization paused during ${currentMode === "gallop" ? "rhythm galloping" : "breathing meditation"}. toggle pause button to resume.`;
      streakBar.style.width = "0%";
      vignette.style.setProperty("--blinder-strength", "0px");
      return;
    }

    if (currentMode === "gallop") {
      if (streak >= 12 && !lineOfFlightActive) {
        lineOfFlightActive = true;
        lineOfFlightTimer = Date.now() + 6000;
        playHoofbeatTone(392, 0.3);
      }

      if (lineOfFlightActive) {
        alignmentState.innerText = "horse-whole";
        statusLore.innerText =
          "line of flight active! blinders completely dissolved";
        statusLore.style.color = "#bcf533";
        streakBar.style.width = "100%";
        vignette.style.setProperty("--blinder-strength", "0px");
      } else {
        if (streak === 0) alignmentState.innerText = "dormant";
        else if (streak < 6) alignmentState.innerText = "vibrating";
        else alignmentState.innerText = "resonant";

        statusLore.innerText =
          "hit spacebar when rings converge onto your inner horse node";
        statusLore.style.color = "rgba(255,255,255,0.7)";
        streakBar.style.width = `${Math.min((streak / 12) * 100, 100)}%`;
        vignette.style.setProperty(
          "--blinder-strength",
          `${blinderPressure}vw`,
        );
      }
    } else if (currentMode === "meditate") {
      alignmentState.innerText = "breathing";
    }
  }

  function setMode(mode) {
    icnGallop.classList.remove("active");
    icnMeditate.classList.remove("active");
    icnPause.classList.remove("active");

    if (mode === "paused") {
      if (!isPaused) {
        // Halt temporal loops
        isPaused = true;
        pauseStarted = Date.now();
      } else {
        // Resume loops and adjust internal delta vectors chronologically
        isPaused = false;
        const delta = Date.now() - pauseStarted;

        activeNotes.forEach((note) => {
          note.spawnTime += delta;
          note.targetTime += delta;
        });

        if (lineOfFlightActive) lineOfFlightTimer += delta;

        initAudio();
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      }
    } else {
      // Switching to a real operational background mode clears old notes and instantly starts execution
      currentMode = mode;
      isPaused = false;
      activeNotes = [];
      streak = 0;
      lineOfFlightActive = false;
      targetNode.style.transform = "scale(1)";

      initAudio();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    }

    // Retain accurate nested visual lighting tracking feedback loops
    if (currentMode === "gallop") icnGallop.classList.add("active");
    if (currentMode === "meditate") icnMeditate.classList.add("active");
    if (isPaused) icnPause.classList.add("active");

    updateTelemetryUI();
  }

  icnGallop.onclick = () => setMode("gallop");
  icnMeditate.onclick = () => setMode("meditate");
  icnPause.onclick = () => setMode("paused");

  minimizeBtn.onclick = () => {
    if (!isPaused) {
      isPaused = true;
      pauseStarted = Date.now();
    }
    icnPause.classList.add("active");
    updateTelemetryUI();
    windowContainer.style.display = "none";
    taskbarDock.style.display = "flex";
  };

  taskbarDock.onclick = () => {
    taskbarDock.style.display = "none";
    windowContainer.style.display = "flex";
    window.__highestVistaZIndex++;
    windowContainer.style.zIndex = window.__highestVistaZIndex;
  };

  windowContainer.addEventListener("mousedown", () => {
    window.__highestVistaZIndex++;
    windowContainer.style.zIndex = window.__highestVistaZIndex;
  });

  const banner = windowContainer.querySelector(".ig-window-banner");
  banner.addEventListener("mousedown", (e) => {
    if (e.target === minimizeBtn) return;
    e.preventDefault();

    const initialX = windowPos.x;
    const initialY = windowPos.y;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMouseMove(moveEvent) {
      windowPos.x = initialX + (moveEvent.clientX - startX);
      windowPos.y = initialY + (moveEvent.clientY - startY);

      windowContainer.style.left = windowPos.x + "px";
      windowContainer.style.top = windowPos.y + "px";
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

  function updateGraphicsFrame() {
    const now = Date.now();

    if (isPaused) {
      // Loop structural engine, but block physical updates
      gameLoopId = requestAnimationFrame(updateGraphicsFrame);
      return;
    }

    if (currentMode === "gallop") {
      activeNotes = activeNotes.filter((note) => {
        if (!note.processed && now > note.targetTime + 160) {
          streak = 0;
          if (!lineOfFlightActive)
            blinderPressure = Math.min(100, blinderPressure + 12);
          triggerUIVisualFlash("blinders constricted", false);
          updateTelemetryUI();
          return false;
        }
        return !note.processed;
      });

      if (lineOfFlightActive && now > lineOfFlightTimer) {
        lineOfFlightActive = false;
        streak = 0;
        updateTelemetryUI();
      }

      const existingRings = rhythmRoot.querySelectorAll(".ig-frequency-ring");
      existingRings.forEach((r) => r.remove());

      activeNotes.forEach((note) => {
        const remainingTime = note.targetTime - now;
        const totalLifetime = note.targetTime - note.spawnTime;
        const progress = remainingTime / totalLifetime;

        if (progress > 0) {
          const ring = document.createElement("div");
          ring.className = "ig-frequency-ring";
          const diameter = 50 + progress * 160;
          ring.style.width = `${diameter}px`;
          ring.style.height = `${diameter}px`;

          if (progress < 0.18) {
            ring.style.borderColor = "rgba(188, 245, 51, 0.8)";
          } else {
            ring.style.borderColor = `rgba(0, 242, 254, ${Math.min(1 - progress, 0.5)})`;
          }
          trackZone.appendChild(ring);
        }
      });
    } else if (currentMode === "meditate") {
      meditationClock += 0.025;
      const breathPhase = Math.sin(meditationClock);

      const isExpanding = Math.cos(meditationClock) > 0;

      const calculatedScale = 1.35 + breathPhase * 0.4;
      targetNode.style.transform = `scale(${calculatedScale})`;

      if (isExpanding) {
        statusLore.innerHTML = `<span style="color: #bcf533; font-weight: bold;">inhale:</span> fill your lungs with the uncommodified rhythm of the herd`;
      } else {
        const targetIndex =
          Math.floor((meditationClock + Math.PI / 2) / (2 * Math.PI)) %
          HORSE_THOUGHTS.length;
        if (targetIndex !== lastThoughtIndex) {
          lastThoughtIndex = targetIndex;
          playHoofbeatTone(60, 0.5, "sine");
        }
        statusLore.innerHTML = `<span style="color: #00f2fe; font-weight: bold;">exhale:</span> ${HORSE_THOUGHTS[targetIndex]}`;
      }
    }

    gameLoopId = requestAnimationFrame(updateGraphicsFrame);
  }

  gameLoopId = requestAnimationFrame(updateGraphicsFrame);
}

export function unmountInnerGallop() {
  window.removeEventListener("keydown", handleStrikeInput);

  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  if (beatIntervalId) clearInterval(beatIntervalId);

  const styleEl = document.getElementById("ig-styles");
  if (styleEl) styleEl.remove();

  if (rhythmRoot) {
    rhythmRoot.remove();
    rhythmRoot = null;
  }

  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }

  activeNotes = [];
  streak = 0;
  blinderPressure = 0;
  lineOfFlightActive = false;
  currentMode = "gallop";
  isPaused = true;
}
