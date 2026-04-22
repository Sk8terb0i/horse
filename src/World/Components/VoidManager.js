import gsap from "gsap";

export function createVoidManager() {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";
  const PARTS_PATH = import.meta.env.BASE_URL + "GlueFactoryAssets/";
  let syncInterval, heartInterval;
  let isPlaying = true;
  let currentManifestations = [];
  let currentMessages = [];
  let currentIndex = 0;
  let msgIndex = 0;
  let isInitialized = false;

  const savedVolume =
    localStorage.getItem("void_volume") !== null
      ? parseFloat(localStorage.getItem("void_volume"))
      : 0.25;

  const funeralAudio = new Audio(ASSET_PATH + "funeral.mp3");
  funeralAudio.loop = true;
  funeralAudio.volume = savedVolume;

  // Unified function to ensure the icon is always in sync with 'isPlaying'
  const updatePlayPauseIcon = () => {
    const iconContainer = document.querySelector(
      "#void-memory-win .void-icon-container",
    );
    if (!iconContainer) return;

    // isPlaying = true means music is active, so show the PAUSE icon
    iconContainer.innerHTML = isPlaying
      ? `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="3" height="8" fill="black" /><rect x="6" y="1" width="3" height="8" fill="black" /></svg>`
      : `<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1 L9 5 L2 9 Z" fill="black" /></svg>`;
  };

  const createWindow = (
    id,
    title,
    width,
    top,
    left,
    hasControls = false,
    isBottleWin = false,
  ) => {
    let win = document.getElementById(id);
    if (!win) {
      win = document.createElement("div");
      win.id = id;
      document.body.appendChild(win);
    }
    const contentHeight = (width / 1800) * 1126;
    win.style.cssText = `position: fixed; top: ${top}; left: ${left}; background: #c0c0c0; border: 2px outset #fff; padding: 3px; z-index: 9998; width: ${width}px; display: none; flex-direction: column; box-shadow: 5px 5px 15px rgba(0,0,0,0.5); font-family: 'MS Sans Serif', Arial, sans-serif;`;
    const bgStyle = isBottleWin ? "background: #008080;" : "background: #000;";

    win.innerHTML = `
      <div class="void-handle" style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 6px; font-weight: bold; font-size: 12px; cursor: move; display: flex; justify-content: space-between; align-items: center;">
        <span>${title}</span>
      </div>
      <div class="void-content" style="width: 100%; height: ${contentHeight || "auto"}px; position: relative; border: 2px inset #fff; margin-top: 3px; ${bgStyle} overflow: hidden; display: flex; align-items: center; justify-content: center;"></div>
      ${
        hasControls
          ? `
        <div class="void-controls" style="display: flex; align-items: center; gap: 10px; padding: 4px; background: #c0c0c0; border-top: 1px solid #808080;">
          <button id="void-play-pause" style="width: 28px; height: 22px; cursor: pointer; background: #c0c0c0; border: 2px outset #fff; display: flex; align-items: center; justify-content: center; padding: 0;">
            <div class="void-icon-container" style="display:flex;"></div>
          </button>
          <div style="display: flex; align-items: center; gap: 5px; flex-grow: 1; justify-content: flex-end;">
            <span style="font-size: 10px; color: black; font-weight: bold;">VOL</span>
            <input type="range" id="void-volume" min="0" max="1" step="0.01" value="${funeralAudio.volume}" style="width: 80px; height: 12px; cursor: pointer;">
          </div>
        </div>`
          : ""
      }
    `;
    return win;
  };

  const bottleWin = createWindow(
    "void-bottle-win",
    "Eternal Glue",
    250,
    "15vh",
    "10vw",
    false,
    true,
  );
  const memoryWin = createWindow(
    "void-memory-win",
    "Eternal Memory",
    600,
    "20vh",
    "35vw",
    true,
    false,
  );
  const ledgerWin = createWindow(
    "void-ledger-win",
    "The Binding Ledger",
    300,
    "65vh",
    "5vw",
    false,
    false,
  );
  const msgSlideshowWin = createWindow(
    "void-msg-slideshow",
    "Glue Wisdom",
    450,
    "55vh",
    "35vw",
    false,
    false,
  );

  const sContentMain = msgSlideshowWin.querySelector(".void-content");
  sContentMain.style.height = "140px";
  sContentMain.style.backgroundColor = "#008080";
  sContentMain.style.backgroundImage = `url('${ASSET_PATH}glue.png')`;
  sContentMain.style.backgroundRepeat = "repeat-x";
  sContentMain.style.backgroundPosition = "top left";
  sContentMain.style.backgroundSize = "150px auto";

  const popup = document.createElement("div");
  popup.id = "void-popup-note";
  popup.style.cssText = `position: fixed; top: 70vh; left: 62vw; background: #c0c0c0; border: 2px outset #fff; padding: 3px; z-index: 9999; width: 300px; display: none; flex-direction: column; box-shadow: 5px 5px 15px rgba(0,0,0,0.5); font-family: 'MS Sans Serif', Arial, sans-serif;`;
  popup.innerHTML = `
    <div id="void-pop-handle" style="background: #000080; color: white; padding: 3px 5px; font-weight: bold; font-size: 12px; margin-bottom: 15px; cursor: move;">Message</div>
    <div style="padding: 10px 20px; font-size: 12px; color: #000; text-align: center; line-height: 1.5;">Add your own horse to the eternal planes so their glue can keep us together.</div>
    <div style="display: flex; justify-content: center; padding: 10px;"><button id="void-ok-btn" style="background: #c0c0c0; border: 2px outset #fff; padding: 4px 15px; cursor: pointer; font-family: 'MS Sans Serif'; font-size: 12px; color: black;">create glue</button></div>
  `;
  document.body.appendChild(popup);

  ledgerWin.querySelector(".void-content").style.height = "auto";
  ledgerWin.querySelector(".void-content").style.background = "#c0c0c0";
  ledgerWin.querySelector(".void-content").innerHTML = `
    <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
      <label style="font-size: 11px; color: #000;">Record a thought for the fallen:</label>
      <textarea id="void-msg-input" style="width: 100%; height: 60px; border: 2px inset #fff; background: white; font-family: serif; font-size: 13px; padding: 5px; resize: none; outline: none; box-sizing: border-box;"></textarea>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 9px; color: #444; font-style: italic;">Limit: 1 entry per day.</span>
        <button id="void-submit-msg" style="background: #c0c0c0; border: 2px outset #fff; padding: 2px 10px; font-size: 11px; cursor: pointer;">Post</button>
      </div>
    </div>`;

  const makeDraggable = (el, handleSelector) => {
    const handle = el.querySelector(handleSelector);
    let mx = 0,
      my = 0;
    handle.onmousedown = (e) => {
      mx = e.clientX - el.offsetLeft;
      my = e.clientY - el.offsetTop;
      const move = (me) => {
        el.style.left = me.clientX - mx + "px";
        el.style.top = me.clientY - my + "px";
      };
      const stop = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", stop);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    };
  };

  [bottleWin, memoryWin, ledgerWin, msgSlideshowWin, popup].forEach((w) => {
    const h =
      w.querySelector(".void-handle") || w.querySelector("#void-pop-handle");
    makeDraggable(w, h.id ? `#${h.id}` : ".void-handle");
  });

  const renderHorse = (container, config) => {
    container.innerHTML = "";
    container.style.backgroundImage = `url('${PARTS_PATH}bg_dressup_room.jpg')`;
    container.style.backgroundSize = "100% 100%";
    const scaleMultiplier = 600 / 1800;
    config.forEach((p) => {
      const img = document.createElement("img");
      const l = String(p.x).includes("%")
        ? p.x
        : (parseFloat(p.x) / 1800) * 100 + "%";
      const t = String(p.y).includes("%")
        ? p.y
        : (parseFloat(p.y) / 1126) * 100 + "%";
      img.src = `${PARTS_PATH}${p.file}`;
      img.style.cssText = `position: absolute; left: ${l}; top: ${t}; transform: translate(-50%, -50%) scale(${(parseFloat(p.scale) || 0.7) * scaleMultiplier}) rotate(${p.rotate || 0}deg); z-index: ${p.zIndex || 10}; pointer-events: none; opacity: 1; ${p.category?.includes("_back") ? "filter: brightness(0.7);" : ""}`;
      container.appendChild(img);
    });
    const hContainer = document.createElement("div");
    hContainer.id = "void-hearts-container";
    hContainer.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:hidden; z-index:100;";
    container.appendChild(hContainer);
  };

  const updateFrames = () => {
    if (!isPlaying || currentManifestations.length === 0) return;
    const m = currentManifestations[currentIndex];
    const bContent = bottleWin.querySelector(".void-content");
    const mContent = memoryWin.querySelector(".void-content");
    const sContent = msgSlideshowWin.querySelector(".void-content");

    gsap.to([bContent, mContent, sContent], {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        bContent.innerHTML = `<img src="${m.finalImage}" style="max-width: 90%; max-height: 90%; object-fit: contain;">`;
        renderHorse(mContent, m.config);

        if (currentMessages.length > 0) {
          const msg = currentMessages[msgIndex];
          const neonColors = [
            "#ff00ff",
            "#00ffff",
            "#ff1493",
            "#00bfff",
            "#ff0099",
          ];

          let splatterHTML = "";
          const count = Math.floor(Math.random() * 2) + 2;
          for (let i = 0; i < count; i++) {
            const color =
              neonColors[Math.floor(Math.random() * neonColors.length)];
            const x = Math.random() * 80 + 10;
            const y = Math.random() * 50 + 30;
            const scale = Math.random() * 0.3 + 0.2;
            splatterHTML += `<div style="position:absolute; left:${x}%; top:${y}%; width:100px; height:100px; background-color:${color}; -webkit-mask-image:url('${ASSET_PATH}glue_glitter.png'); -webkit-mask-size:contain; -webkit-mask-repeat:no-repeat; transform:translate(-50%, -50%) scale(${scale}); pointer-events:none; z-index:1;"></div>`;
          }

          // FIXED: Added a semi-opaque teal rectangle (inset border) behind text for readability
          sContent.innerHTML = `
            ${splatterHTML}
            <div style="position: relative; padding: 10px; background: rgba(0, 128, 128, 0.7); border: 2px inset #fff; z-index: 2; display: flex; align-items: center; justify-content: center; width: 85%; box-sizing: border-box;">
              <div style="text-align: center; font-family: 'Impact', 'Comic Sans MS', sans-serif; font-size: 24px; font-weight: bold; line-height: 1.2; background: linear-gradient(to bottom, #ff0000 0%, #ffff00 50%, #00ff00 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(3px 3px 0px #000080); text-transform: uppercase;">
                "${msg.text}"
              </div>
            </div>`;
          msgIndex = (msgIndex + 1) % currentMessages.length;
        } else {
          sContent.innerHTML = `<div style="color: #00ff00; font-family: 'MS Sans Serif'; font-size: 11px; z-index: 2;">SCANNING FOR SOULS...</div>`;
        }
        gsap.to([bContent, mContent, sContent], { opacity: 1, duration: 1 });
        currentIndex = (currentIndex + 1) % currentManifestations.length;
      },
    });
  };

  const playBtn = memoryWin.querySelector("#void-play-pause");
  const volSlider = memoryWin.querySelector("#void-volume");

  playBtn.onclick = () => {
    isPlaying = !isPlaying;
    updatePlayPauseIcon();
    playBtn.style.border = isPlaying ? "2px outset #fff" : "2px inset #fff";
    if (isPlaying) funeralAudio.play();
    else funeralAudio.pause();
  };

  volSlider.oninput = (e) => {
    funeralAudio.volume = e.target.value;
    localStorage.setItem("void_volume", e.target.value);
  };
  popup.querySelector("#void-ok-btn").onclick = () =>
    (window.location.hash = "#/ritual");

  return {
    start: (manifestations, messages = []) => {
      if (!manifestations || manifestations.length === 0) return;
      currentManifestations = manifestations;
      currentMessages = messages;
      if (!isInitialized) {
        currentIndex = 0;
        msgIndex = 0;
        isPlaying = true;
        isInitialized = true;

        // Initial icon update
        setTimeout(updatePlayPauseIcon, 100);

        const attemptPlay = funeralAudio.play();
        if (attemptPlay !== undefined)
          attemptPlay.catch(() => {
            const res = () => {
              if (isPlaying) {
                funeralAudio.play();
                updatePlayPauseIcon();
              }
              document.removeEventListener("click", res);
            };
            document.addEventListener("click", res);
          });

        updateFrames();
        syncInterval = setInterval(updateFrames, 5000);
        heartInterval = setInterval(() => {
          if (!isPlaying) return;
          const heartBox = document.getElementById("void-hearts-container");
          if (!heartBox) return;
          const h = document.createElement("img");
          h.src = ASSET_PATH + "heart.png";
          h.style.cssText = `position:absolute; width:30px; left:${Math.random() * 90}%; top:100%; opacity:0; transition: transform 3s linear, opacity 1.5s;`;
          heartBox.appendChild(h);
          void h.offsetWidth;
          h.style.transform = `translateY(-450px) scale(${Math.random() * 0.8 + 0.5})`;
          h.style.opacity = 0.8;
          setTimeout(() => h.remove(), 3000);
        }, 600);
      }
      [bottleWin, memoryWin, ledgerWin, msgSlideshowWin, popup].forEach(
        (w) => (w.style.display = "flex"),
      );

      const submitBtn = ledgerWin.querySelector("#void-submit-msg");
      const inputField = ledgerWin.querySelector("#void-msg-input");
      submitBtn.onclick = () => {
        const text = inputField.value.trim();
        if (!text) return;
        const lastPost = localStorage.getItem("void_last_post");
        if (lastPost === new Date().toDateString()) {
          alert("Notice: You have already recorded an entry for this cycle.");
          return;
        }
        if (window.VoidAPI_SubmitMessage) {
          window.VoidAPI_SubmitMessage(text);
          localStorage.setItem("void_last_post", new Date().toDateString());
          inputField.value = "";
          inputField.disabled = true;
          submitBtn.disabled = true;
        }
      };
    },
    stop: () => {
      funeralAudio.pause();
      isInitialized = false;
      [bottleWin, memoryWin, ledgerWin, msgSlideshowWin, popup].forEach(
        (w) => (w.style.display = "none"),
      );
      clearInterval(syncInterval);
      clearInterval(heartInterval);
      isPlaying = false;
    },
  };
}
