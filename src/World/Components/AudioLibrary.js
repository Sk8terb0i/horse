import gsap from "gsap";

export function createAudioLibrary(currentUsername) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  const savedIconPos = JSON.parse(localStorage.getItem("audio_icon_pos")) || {
    top: 320,
    left: 100,
  };
  const savedWindowPos = JSON.parse(
    localStorage.getItem("audio_window_pos"),
  ) || { top: 200, left: 250 };

  // State tracking
  let isAppRunning = localStorage.getItem("audio_running") === "true";
  let isWindowVisible = isAppRunning;

  const player = new Audio();
  let currentlyPlayingItem = null;

  const icon = document.createElement("div");
  icon.id = "audio-library-standalone";
  icon.style.cssText = `
    position: fixed; top: ${savedIconPos.top}px; left: ${savedIconPos.left}px;
    z-index: 5000; cursor: pointer; display: ${currentUsername ? "flex" : "none"};
    flex-direction: column; align-items: center; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  icon.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="width: 55px; height: 55px; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));">
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="headphone-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#5cb3ff" />
              <stop offset="100%" stop-color="#0059b3" />
            </linearGradient>
            <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
              <stop offset="50%" stop-color="#ffffff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path d="M15,55 A35,35 0 0,1 85,55" fill="none" stroke="#e0e0e0" stroke-width="8" stroke-linecap="round" />
          <path d="M15,55 A35,35 0 0,1 85,55" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" opacity="0.3" />
          
          <rect x="10" y="50" width="18" height="30" rx="6" fill="url(#headphone-grad)" />
          <rect x="12" y="52" width="6" height="26" rx="2" fill="url(#glass-shine)" />
          
          <rect x="72" y="50" width="18" height="30" rx="6" fill="url(#headphone-grad)" />
          <rect x="74" y="52" width="6" height="26" rx="2" fill="url(#glass-shine)" />
          
          <path d="M45,45 L60,55 L45,65 Z" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>
      <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: 5px; pointer-events: none;">Audio</span>
    </div>
  `;

  icon.onmouseenter = () => (icon.style.transform = "scale(1.15)");
  icon.onmouseleave = () => (icon.style.transform = "scale(1)");

  const windowEl = document.createElement("div");
  windowEl.className = "vista-window";

  windowEl.style.cssText = `
    display: ${isWindowVisible ? "flex" : "none"}; visibility: ${isWindowVisible ? "visible" : "hidden"}; 
    opacity: ${isWindowVisible ? 1 : 0}; transform: ${isWindowVisible ? "scale(1)" : "scale(0.9) translateY(10px)"};
    position: fixed; top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px;
    width: 380px; height: 520px; z-index: 5001; flex-direction: column; pointer-events: ${isWindowVisible ? "auto" : "none"};
    overflow: hidden; background: url('${ASSET_PATH}audio_bg.webp') center/cover no-repeat;
    border-radius: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.4);
  `;

  windowEl.innerHTML = `
    <div class="vista-title-bar" id="audio-drag-handle" style="cursor: move; user-select: none;">
      <div class="vista-title">Media Player</div>
      
      <div style="display: flex; gap: 6px; align-items: center;">
        <div id="audio-minimize-btn" style="width: 24px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05)); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; transition: background 0.2s;">
          <div style="width: 10px; height: 2px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.5);"></div>
        </div>
        
        <div id="audio-close-btn" style="width: 38px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%); cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3);">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));"></path></svg>
        </div>
      </div>

    </div>
    
    <div style="padding: 15px; background: rgba(255,255,255,0.2); border-bottom: 1px solid rgba(255,255,255,0.4); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); display: flex; flex-direction: column; gap: 12px; align-items: center; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
      <div id="now-playing-title" style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 15px; font-weight: bold; color: #001a33; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-shadow: 0 0 5px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,0.8);">
        Select an episode to play
      </div>
      
      <div style="display: flex; align-items: center; gap: 15px; width: 100%; justify-content: center;">
        <button id="player-play-btn" style="width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.9); background: radial-gradient(circle at 30% 30%, #5cb3ff, #0059b3); color: white; cursor: pointer; box-shadow: inset 0 2px 5px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.4); font-size: 16px; display: flex; align-items: center; justify-content: center; outline: none; transition: transform 0.1s;">▶</button>
        
        <div id="player-progress-bg" style="flex-grow: 1; height: 14px; background: rgba(0,0,0,0.3); border-radius: 7px; cursor: pointer; border: 1px solid rgba(255,255,255,0.3); box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); position: relative; overflow: hidden;">
          <div id="player-progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #5cb3ff, #08fbff); pointer-events: none; border-radius: 7px; box-shadow: 0 0 8px #08fbff;"></div>
        </div>
        
        <div id="player-time" style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.9); min-width: 35px; font-weight: bold;">0:00</div>
      </div>
    </div>

    <div class="vista-content-area" id="audio-items-container" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; overflow-y: auto; flex-grow: 1; background: transparent;">
      <div style="color: white; text-shadow: 0 1px 3px black; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 13px; text-align: center; font-style: italic; margin-top: 20px;">Loading episodes...</div>
    </div>
  `;

  document.body.appendChild(icon);
  document.body.appendChild(windowEl);

  // --- WINDOW MANAGEMENT ---
  const bringToFront = () => {
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 5001) + 1;
    windowEl.style.zIndex = window.__highestVistaZIndex;
  };
  windowEl.addEventListener("mousedown", bringToFront);

  const audioIconSVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M15,55 A35,35 0 0,1 85,55" fill="none" stroke="%23cccccc" stroke-width="10" stroke-linecap="round" />
      <rect x="10" y="50" width="20" height="35" rx="6" fill="%230059b3" />
      <rect x="70" y="50" width="20" height="35" rx="6" fill="%230059b3" />
      <path d="M45,45 L60,55 L45,65 Z" fill="white" />
    </svg>
  `)}`;

  const syncTaskbar = () => {
    if (window.TaskbarAPI) {
      window.TaskbarAPI.updateApp(
        "audio-library",
        "Media Player",
        audioIconSVG,
        isAppRunning,
        isWindowVisible,
        () => {
          isWindowVisible = !isWindowVisible;
          if (isWindowVisible) bringToFront();
          animateWindow(isWindowVisible);
          syncTaskbar();
        },
      );
    }
  };
  setTimeout(syncTaskbar, 100);

  // 3. MEDIA PLAYER LOGIC
  const playBtn = windowEl.querySelector("#player-play-btn");
  const progressBg = windowEl.querySelector("#player-progress-bg");
  const progressFill = windowEl.querySelector("#player-progress-fill");
  const timeDisplay = windowEl.querySelector("#player-time");
  const titleDisplay = windowEl.querySelector("#now-playing-title");

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  playBtn.onclick = () => {
    if (!player.src) return;
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  };

  playBtn.onmousedown = () => (playBtn.style.transform = "scale(0.95)");
  playBtn.onmouseup = () => (playBtn.style.transform = "scale(1)");
  playBtn.onmouseleave = () => (playBtn.style.transform = "scale(1)");

  player.onplay = () => (playBtn.innerHTML = "⏸");
  player.onpause = () => (playBtn.innerHTML = "▶");

  player.ontimeupdate = () => {
    const percent = (player.currentTime / player.duration) * 100;
    progressFill.style.width = `${percent || 0}%`;
    timeDisplay.innerText = formatTime(player.currentTime);
  };

  progressBg.onclick = (e) => {
    if (!player.src || !player.duration) return;
    const rect = progressBg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    player.currentTime = percent * player.duration;
  };

  const loadPodcast = async () => {
    try {
      const rssUrl = "https://anchor.fm/s/1106e92d4/podcast/rss";
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      const container = windowEl.querySelector("#audio-items-container");
      container.innerHTML = "";

      if (data.status !== "ok" || !data.items || data.items.length === 0)
        throw new Error("No items returned");

      data.items.forEach((item, index) => {
        const title = item.title || "Unknown Episode";
        const audioUrl =
          item.enclosure && item.enclosure.link ? item.enclosure.link : null;

        if (audioUrl) {
          const row = document.createElement("div");

          row.style.cssText = `
            padding: 10px 12px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.6);
            font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 13px; color: #000;
            display: flex; align-items: center; gap: 10px; transition: all 0.2s ease;
            background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(5px); box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          `;

          row.innerHTML = `
            <div style="width: 24px; height: 24px; background: rgba(0,51,102,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #003366; font-weight: bold; border: 1px solid rgba(0,51,102,0.2); flex-shrink: 0;">
              ${index + 1}
            </div>
            <div style="flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">
              ${title}
            </div>
          `;

          row.onmouseenter = () => {
            if (currentlyPlayingItem !== row) {
              row.style.background = "rgba(255, 255, 255, 0.9)";
              row.style.borderColor = "rgba(255, 255, 255, 1)";
              row.style.transform = "translateX(2px)";
            }
          };
          row.onmouseleave = () => {
            if (currentlyPlayingItem !== row) {
              row.style.background = "rgba(255, 255, 255, 0.7)";
              row.style.borderColor = "rgba(255, 255, 255, 0.6)";
              row.style.transform = "translateX(0)";
            }
          };

          row.onclick = () => {
            if (currentlyPlayingItem) {
              currentlyPlayingItem.style.background =
                "rgba(255, 255, 255, 0.7)";
              currentlyPlayingItem.style.borderColor =
                "rgba(255, 255, 255, 0.6)";
              currentlyPlayingItem.style.color = "#000";
              currentlyPlayingItem.style.textShadow = "none";
              currentlyPlayingItem.style.transform = "translateX(0)";
            }

            currentlyPlayingItem = row;
            row.style.background = "linear-gradient(180deg, #5cb3ff, #0059b3)";
            row.style.borderColor = "#fff";
            row.style.color = "#fff";
            row.style.textShadow = "0 1px 2px rgba(0,0,0,0.8)";
            row.style.transform = "translateX(4px)";

            titleDisplay.innerText = title;
            player.src = audioUrl;
            player.play();
          };

          container.appendChild(row);
        }
      });
    } catch (err) {
      windowEl.querySelector("#audio-items-container").innerHTML =
        `<div style="color: red; font-family: sans-serif; text-align: center; margin-top: 20px; background: rgba(255,255,255,0.8); padding: 10px; border-radius: 6px;">Failed to load podcast.<br><span style="font-size: 10px; color: #555;">Feed might be private or invalid.</span></div>`;
    }
  };

  loadPodcast();

  const animateWindow = (show) => {
    if (show) {
      windowEl.style.display = "flex";
      windowEl.style.pointerEvents = "auto";
    }
    gsap.to(windowEl, {
      duration: 0.4,
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.9,
      y: show ? 0 : 10,
      visibility: show ? "visible" : "hidden",
      ease: "back.out(1.7)",
      onComplete: () => {
        if (!show) {
          windowEl.style.display = "none";
          windowEl.style.pointerEvents = "none";
        }
      },
    });
  };

  const checkBounds = () => {
    const rect = windowEl.getBoundingClientRect();
    if (rect.right > window.innerWidth)
      windowEl.style.left = window.innerWidth - rect.width - 20 + "px";
  };

  const makeDraggable = (el, handle, saveKey) => {
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;
    const move = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!wasDragged && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        wasDragged = true;
        el.style.transition = "none";
      }
      if (wasDragged) {
        el.style.left = initialLeft + dx + "px";
        el.style.top = initialTop + dy + "px";
        if (el === windowEl) checkBounds();
      }
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      if (wasDragged) {
        if (el === icon)
          el.style.transition =
            "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        localStorage.setItem(
          saveKey,
          JSON.stringify({ top: el.offsetTop, left: el.offsetLeft }),
        );
        setTimeout(() => {
          wasDragged = false;
        }, 50);
      }
    };
    handle.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      wasDragged = false;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
    return () => wasDragged;
  };

  const iconStatus = makeDraggable(icon, icon, "audio_icon_pos");
  makeDraggable(
    windowEl,
    windowEl.querySelector("#audio-drag-handle"),
    "audio_window_pos",
  );

  icon.addEventListener("click", () => {
    if (iconStatus()) return;

    isAppRunning = true;
    isWindowVisible = true;
    localStorage.setItem("audio_running", "true");

    bringToFront();
    animateWindow(true);
    syncTaskbar();
  });

  // --- CUSTOM MINIMIZE BUTTON LOGIC ---
  const minBtn = windowEl.querySelector("#audio-minimize-btn");
  minBtn.onmouseenter = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))");
  minBtn.onmouseleave = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))");
  minBtn.onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false; // Minimizes but stays in taskbar
    animateWindow(false);
    syncTaskbar();
  };

  // --- CSS CLOSE BUTTON LOGIC ---
  const closeBtn = windowEl.querySelector("#audio-close-btn");
  closeBtn.onmouseenter = () => {
    closeBtn.style.background =
      "linear-gradient(180deg, rgba(255,120,120,0.95) 0%, rgba(230,50,50,1) 49%, rgba(200,20,20,1) 50%, rgba(250,70,70,1) 100%)";
    closeBtn.style.boxShadow =
      "inset 0 1px 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,50,50,0.6)";
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.background =
      "linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%)";
    closeBtn.style.boxShadow =
      "inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3)";
  };
  closeBtn.onclick = (e) => {
    e.stopPropagation();

    isAppRunning = false;
    isWindowVisible = false;
    localStorage.setItem("audio_running", "false");

    if (!player.paused) player.pause();

    animateWindow(false);
    syncTaskbar();
  };

  return {
    setDisplay: (show) => {
      icon.style.display = show && currentUsername ? "flex" : "none";
      if (!show) {
        windowEl.style.display = "none";
      } else if (isAppRunning && isWindowVisible) {
        windowEl.style.display = "flex";
        windowEl.style.opacity = "1";
        windowEl.style.visibility = "visible";
      }
    },
  };
}
