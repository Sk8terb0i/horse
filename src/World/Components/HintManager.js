export function createHintManager(username, role) {
  if (!username) return;

  const DONT_REMIND_KEY = `hint_noremind_theme_${username}`;
  const LAST_SWITCH_KEY = `last_theme_switch_time_${username}`;

  // 1. Inject CSS for the Orb Pulsing Animation
  if (!document.getElementById("hint-orb-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "hint-orb-styles";
    styleSheet.innerText = `
      @keyframes hintPulseOrb {
        0% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 5px rgba(255,255,255,0.5); }
        50% { transform: scale(1.4) rotate(15deg); filter: brightness(1.3); box-shadow: 0 0 20px rgba(255,255,255,1); }
        100% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 5px rgba(255,255,255,0.5); }
      }
      .hint-active-orb {
        animation: hintPulseOrb 1.5s infinite !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // 2. Create the Windows 95 style container
  const win = document.createElement("div");
  win.id = "win95-hint-window";
  win.style.cssText = `
    position: fixed;
    bottom: 45px; /* Sits just above the 32px taskbar */
    right: 15px;  /* Anchored to the right side near the orb */
    width: 320px;
    background-color: #c0c0c0;
    border-top: 2px solid #ffffff;
    border-left: 2px solid #ffffff;
    border-right: 2px solid #0a0a0a;
    border-bottom: 2px solid #0a0a0a;
    box-shadow: inset -1px -1px #808080, inset 1px 1px #dfdfdf, 0 4px 15px rgba(0,0,0,0.4);
    font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
    font-size: 12px;
    color: #000;
    z-index: 15000;
    display: none;
    flex-direction: column;
  `;

  // --- Display Helpers ---
  const showHint = () => {
    win.style.display = "flex";
    const orb = document.getElementById("tray-theme-orb");
    if (orb) orb.classList.add("hint-active-orb");
  };

  const hideHint = () => {
    win.style.display = "none";
    const orb = document.getElementById("tray-theme-orb");
    if (orb) orb.classList.remove("hint-active-orb");
  };

  // 3. Title Bar
  const titleBar = document.createElement("div");
  titleBar.style.cssText = `
    background: #000080;
    color: white;
    padding: 2px 4px;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    margin: 2px;
  `;
  const titleText = document.createElement("span");
  titleText.innerText = "Hint";

  const closeBtn = document.createElement("div");
  closeBtn.innerText = "x";
  closeBtn.style.cssText = `
    background: #c0c0c0;
    color: black;
    width: 14px;
    height: 14px;
    text-align: center;
    line-height: 10px;
    cursor: pointer;
    font-weight: bold;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    font-family: monospace;
  `;
  closeBtn.onclick = hideHint;

  titleBar.appendChild(titleText);
  titleBar.appendChild(closeBtn);
  win.appendChild(titleBar);

  // 4. Body Content
  const body = document.createElement("div");
  body.style.cssText = "padding: 15px;";

  const content = document.createElement("div");
  content.style.cssText =
    "margin-bottom: 20px; display: flex; gap: 15px; align-items: center;";

  // Fake "Info" icon
  content.innerHTML = `
    <div style="font-size: 24px; color: #000080; font-family: serif; font-weight: bold; background: white; border-radius: 50%; min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: inset 1px 1px #808080, inset -1px -1px #dfdfdf;">i</div>
    <div>Did you know? You can switch themes on the taskbar to more deeply understand horse.</div>
  `;
  body.appendChild(content);

  // 5. Buttons Container
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText =
    "display: flex; justify-content: center; gap: 10px;";

  const btnStyle = `
    background: #c0c0c0;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
    box-shadow: inset 1px 1px #dfdfdf, inset -1px -1px #808080;
    padding: 4px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    outline: none;
  `;

  const btnActive = (e) => {
    e.target.style.borderTop = "1px solid #000";
    e.target.style.borderLeft = "1px solid #000";
    e.target.style.borderRight = "1px solid #fff";
    e.target.style.borderBottom = "1px solid #fff";
    e.target.style.boxShadow = "inset 1px 1px #808080, inset -1px -1px #dfdfdf";
  };
  const btnInactive = (e) => {
    e.target.style.borderTop = "1px solid #fff";
    e.target.style.borderLeft = "1px solid #fff";
    e.target.style.borderRight = "1px solid #000";
    e.target.style.borderBottom = "1px solid #000";
    e.target.style.boxShadow = "inset 1px 1px #dfdfdf, inset -1px -1px #808080";
  };

  const createButton = (text, onClick) => {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.style.cssText = btnStyle;
    btn.onclick = onClick;
    btn.addEventListener("mousedown", btnActive);
    btn.addEventListener("mouseup", btnInactive);
    btn.addEventListener("mouseleave", btnInactive);
    return btn;
  };

  if (role !== "exhibiter") {
    btnContainer.appendChild(
      createButton("Don't remind me again", () => {
        localStorage.setItem(DONT_REMIND_KEY, "true");
        hideHint();
      }),
    );
  }

  btnContainer.appendChild(createButton("OK", hideHint));

  body.appendChild(btnContainer);
  win.appendChild(body);
  document.body.appendChild(win);

  // 6. Evaluation Logic
  const evaluateHint = () => {
    if (role === "exhibiter") {
      showHint();
      return;
    }

    if (localStorage.getItem(DONT_REMIND_KEY) === "true") return;

    const lastSwitchStr = localStorage.getItem(LAST_SWITCH_KEY);
    const lastSwitch = lastSwitchStr ? parseInt(lastSwitchStr) : 0;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    if (Date.now() - lastSwitch >= fiveDaysMs) {
      showHint();
    }
  };

  // Wait 3 seconds to avoid popping up right during loading screen
  setTimeout(evaluateHint, 3000);

  // Setup interval based on role
  if (role === "exhibiter") {
    setInterval(showHint, 5 * 60 * 1000); // 5 minutes
  } else {
    // Normal users: Periodically check if 5 days pass while the app happens to remain open
    setInterval(evaluateHint, 60 * 60 * 1000); // 1 hour
  }

  // 7. Close hint if the user clicks the theme orb directly (without permanently dismissing)
  const taskbarOrb = document.getElementById("tray-theme-orb");
  if (taskbarOrb) {
    taskbarOrb.addEventListener("click", hideHint);
  }
}

// NEW EXPORT: Spawns a hint anchored to a specific element on the screen
export function spawnRelativeHint(targetElement, text, storageKey) {
  if (!targetElement) return;
  if (localStorage.getItem(storageKey) === "true") return;
  if (document.getElementById(`hint-${storageKey}`)) return; // Prevent duplicates

  const win = document.createElement("div");
  win.id = `hint-${storageKey}`;
  win.style.cssText = `
    position: fixed;
    width: 320px;
    background-color: #c0c0c0;
    border-top: 2px solid #ffffff;
    border-left: 2px solid #ffffff;
    border-right: 2px solid #0a0a0a;
    border-bottom: 2px solid #0a0a0a;
    box-shadow: inset -1px -1px #808080, inset 1px 1px #dfdfdf, 0 4px 15px rgba(0,0,0,0.4);
    font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
    font-size: 12px;
    color: #000;
    z-index: 16000;
    display: flex;
    flex-direction: column;
  `;

  // Title Bar
  const titleBar = document.createElement("div");
  titleBar.style.cssText = `
    background: #000080; color: white; padding: 2px 4px; font-weight: bold;
    display: flex; justify-content: space-between; align-items: center; margin: 2px;
  `;
  titleBar.innerHTML = `<span>Hint</span>`;

  const closeBtn = document.createElement("div");
  closeBtn.innerText = "x";
  closeBtn.style.cssText = `
    background: #c0c0c0; color: black; width: 14px; height: 14px; text-align: center;
    line-height: 10px; cursor: pointer; font-weight: bold; border-top: 1px solid #fff;
    border-left: 1px solid #fff; border-right: 1px solid #000; border-bottom: 1px solid #000;
  `;
  titleBar.appendChild(closeBtn);
  win.appendChild(titleBar);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding: 15px;";
  body.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; gap: 15px; align-items: center;">
      <div style="font-size: 24px; color: #000080; font-family: serif; font-weight: bold; background: white; border-radius: 50%; min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: inset 1px 1px #808080, inset -1px -1px #dfdfdf;">i</div>
      <div>${text}</div>
    </div>
  `;

  // Buttons
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText =
    "display: flex; justify-content: center; gap: 10px;";

  const createBtn = (btnText, onClick) => {
    const b = document.createElement("button");
    b.innerText = btnText;
    b.style.cssText = `
      background: #c0c0c0; border-top: 1px solid #fff; border-left: 1px solid #fff;
      border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 12px;
      cursor: pointer; font-family: inherit; font-size: 11px; outline: none;
    `;
    b.onmousedown = () =>
      (b.style.boxShadow = "inset 1px 1px #808080, inset -1px -1px #dfdfdf");
    b.onmouseup = () => (b.style.boxShadow = "none");
    b.onclick = onClick;
    return b;
  };

  // Add a highlight ring to the target element to draw attention
  const origShadow = targetElement.style.boxShadow;
  targetElement.style.boxShadow =
    "0 0 0 3px #000080, 0 0 10px rgba(0,0,128,0.5)";

  const orb = document.getElementById("tray-theme-orb");

  // Define cleanup first so we can attach it to the orb
  const cleanup = () => {
    targetElement.style.boxShadow = origShadow;
    if (storageKey === "hint_wiki_lone" && orb) {
      orb.classList.remove("hint-active-orb");
      orb.removeEventListener("click", cleanup); // Remove the listener so it doesn't leak
    }
    win.remove();
  };

  // Make the theme orb react if this is the theme switching hint
  if (storageKey === "hint_wiki_lone" && orb) {
    orb.classList.add("hint-active-orb");
    orb.addEventListener("click", cleanup); // Close the hint if they click the orb
  }

  closeBtn.onclick = cleanup;
  btnContainer.appendChild(
    createBtn("Don't remind me again", () => {
      localStorage.setItem(storageKey, "true");
      cleanup();
    }),
  );
  btnContainer.appendChild(createBtn("OK", cleanup));

  body.appendChild(btnContainer);
  win.appendChild(body);

  // Smart Positioning: Anchor to the right, but flip left if it goes off-screen
  const rect = targetElement.getBoundingClientRect();
  let left = rect.right + 15;
  let top = rect.top;

  if (left + 320 > window.innerWidth) left = rect.left - 335;
  if (top + 150 > window.innerHeight) top = window.innerHeight - 160;

  win.style.left = Math.max(0, left) + "px";
  win.style.top = Math.max(0, top) + "px";

  document.body.appendChild(win);
}
