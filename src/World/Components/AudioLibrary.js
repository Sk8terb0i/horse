import gsap from "gsap";

export function createAudioLibrary(currentUsername) {
  const ASSET_PATH = import.meta.env.BASE_URL + "assets/";

  // Persistent positions
  const savedIconPos = JSON.parse(localStorage.getItem("audio_icon_pos")) || {
    top: 320,
    left: 100,
  };
  const savedWindowPos = JSON.parse(
    localStorage.getItem("audio_window_pos"),
  ) || { top: 200, left: 250 };
  let isExpanded = false;

  // 1. THE DESKTOP ICON
  const icon = document.createElement("div");
  icon.id = "audio-library-standalone";
  icon.style.cssText = `
    position: fixed; top: ${savedIconPos.top}px; left: ${savedIconPos.left}px;
    z-index: 5000; cursor: pointer; display: ${currentUsername ? "flex" : "none"};
    flex-direction: column; align-items: center; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  icon.innerHTML = `
    <img src="${ASSET_PATH}audio.png" style="width: 60px; height: auto; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3)); pointer-events: none;">
    <span style="font-family: serif; font-size: 14px; color: white; text-shadow: 1px 1px 3px black; margin-top: 5px; pointer-events: none;">Audio</span>
  `;

  icon.onmouseenter = () => (icon.style.transform = "scale(1.15)");
  icon.onmouseleave = () => (icon.style.transform = "scale(1)");

  // 2. THE VISTA WINDOW
  const windowEl = document.createElement("div");
  windowEl.className = "vista-window";
  windowEl.style.cssText = `
    display: none; visibility: hidden; opacity: 0; transform: scale(0.9) translateY(10px);
    position: fixed; top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px;
    width: 360px; height: 500px; z-index: 5001; flex-direction: column; pointer-events: none;
  `;

  windowEl.innerHTML = `
    <div class="vista-title-bar" id="audio-drag-handle" style="cursor: move; user-select: none;">
      <div class="vista-title">Podcast Library</div>
      <img src="${ASSET_PATH}aero_close.png" id="audio-close-btn" style="height: 22px; cursor: pointer; transition: filter 0.2s;">
    </div>
    <div class="vista-content-area" id="audio-items-container" style="display: flex; flex-direction: column; gap: 15px; padding: 20px; overflow-y: auto; flex-grow: 1;">
      <div style="color: #000; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; text-align: center; font-style: italic;">Loading episodes...</div>
    </div>
  `;

  document.body.appendChild(icon);
  document.body.appendChild(windowEl);

  // 3. FETCH & PARSE RSS FEED
  const loadPodcast = async () => {
    try {
      const rssUrl = "https://anchor.fm/s/1106e92d4/podcast/rss";
      // CORS Proxy to allow frontend fetching
      const response = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
      );
      const text = await response.text();
      const xml = new window.DOMParser().parseFromString(text, "text/xml");
      const items = Array.from(xml.querySelectorAll("item"));

      const container = windowEl.querySelector("#audio-items-container");
      container.innerHTML = ""; // Clear loader

      items.forEach((item) => {
        const title =
          item.querySelector("title")?.textContent || "Unknown Episode";
        const enclosure = item.querySelector("enclosure");
        const audioUrl = enclosure ? enclosure.getAttribute("url") : null;

        if (audioUrl) {
          const card = document.createElement("div");
          card.style.cssText = `
            background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 8px; padding: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            display: flex; flex-direction: column; gap: 8px; backdrop-filter: blur(5px);
          `;
          card.innerHTML = `
            <div style="font-family: 'Segoe UI', Tahoma, sans-serif; font-weight: 600; font-size: 13px; color: #003366; line-height: 1.2;">${title}</div>
            <audio controls style="width: 100%; height: 35px; outline: none;">
              <source src="${audioUrl}" type="audio/mpeg">
            </audio>
          `;
          container.appendChild(card);
        }
      });
    } catch (err) {
      windowEl.querySelector("#audio-items-container").innerHTML =
        `<div style="color: red; text-align: center;">Failed to load podcast.</div>`;
    }
  };

  loadPodcast();

  // 4. ANIMATION & INTERACTION LOGIC
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
    isExpanded = !isExpanded;
    animateWindow(isExpanded);
  });

  windowEl.querySelector("#audio-close-btn").onclick = (e) => {
    e.stopPropagation();
    isExpanded = false;
    animateWindow(false);
  };

  // 5. EXPORT METHOD FOR NAVIGATION SYNC
  return {
    setDisplay: (show) => {
      icon.style.display = show && currentUsername ? "flex" : "none";
      if (!show) {
        windowEl.style.display = "none";
      } else if (isExpanded) {
        windowEl.style.display = "flex";
        windowEl.style.opacity = "1";
        windowEl.style.visibility = "visible";
      }
    },
  };
}
