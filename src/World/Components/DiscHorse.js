import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  where,
  orderBy,
} from "firebase/firestore";
import gsap from "gsap";

let forumWindowRef = null;
let isAppRunning = false;
let isWindowVisible = false;
let globalSignatures = [];

function syncForumTaskbar() {
  if (window.TaskbarAPI) {
    window.TaskbarAPI.updateApp(
      "dischorse-app",
      "Disc:Horse",
      "assets/dischorse.png",
      isAppRunning,
      isWindowVisible,
      () => {
        isWindowVisible = !isWindowVisible;
        if (forumWindowRef) {
          if (isWindowVisible) bringToFront();
          animateWindow(isWindowVisible);
        }
        syncForumTaskbar();
      },
    );
  }
}

const bringToFront = () => {
  if (!forumWindowRef) return;
  const win = forumWindowRef.querySelector(".forum-window");
  window.__highestVistaZIndex =
    Math.max(window.__highestVistaZIndex || 0, 12000) + 1;
  win.style.zIndex = window.__highestVistaZIndex;
};

const animateWindow = (show) => {
  if (!forumWindowRef) return;
  const win = forumWindowRef.querySelector(".forum-window");
  if (show) {
    forumWindowRef.style.display = "block";
    win.style.pointerEvents = "auto";
  }
  gsap.to(win, {
    duration: 0.4,
    opacity: show ? 1 : 0,
    scale: show ? 1 : 0.9,
    y: show ? 0 : 10,
    visibility: show ? "visible" : "hidden",
    ease: "back.out(1.7)",
    onComplete: () => {
      if (!show) {
        forumWindowRef.style.display = "none";
        win.style.pointerEvents = "none";
      }
    },
  });
};

const openSignaturePicker = (username, currentImgElement) => {
  const userSigs = globalSignatures.filter((s) => s.username === username);
  if (userSigs.length === 0) return;

  const picker = document.createElement("div");
  picker.style.cssText = `
    position: fixed; inset: 0; z-index: 20000; 
    background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(5px); pointer-events: auto;
  `;

  picker.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 12px; width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
      <h3 style="margin-top: 0; color: #0072ff; font-family: 'Segoe UI', sans-serif;">Select Your Horse</h3>
      <div id="sig-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;"></div>
      <button id="close-picker" class="forum-btn" style="margin-top: 20px; width: 100%; background: #94a3b8;">Cancel</button>
    </div>
  `;

  const grid = picker.querySelector("#sig-grid");
  userSigs.forEach((sigData) => {
    const img = document.createElement("img");
    img.src = sigData.drawing;
    img.style.cssText =
      "width: 100%; aspect-ratio: 1; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: transform 0.2s;";
    img.onmouseenter = () => (img.style.transform = "scale(1.05)");
    img.onmouseleave = () => (img.style.transform = "scale(1)");
    img.onclick = () => {
      currentImgElement.src = sigData.drawing;
      picker.remove();
    };
    grid.appendChild(img);
  });

  picker.querySelector("#close-picker").onclick = () => picker.remove();
  document.body.appendChild(picker);
};

const setupSignatureIcon = (username, imgElement) => {
  const userSigs = globalSignatures.filter((s) => s.username === username);
  imgElement.src =
    userSigs.length > 0 && userSigs[0].drawing
      ? userSigs[0].drawing
      : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  imgElement.onclick = (e) => {
    e.stopPropagation();
    openSignaturePicker(username, imgElement);
  };
};

function openForum(db, currentUsername, userRole) {
  isAppRunning = true;
  isWindowVisible = true;
  localStorage.setItem("dischorse_is_open", "true");
  syncForumTaskbar();

  if (forumWindowRef) {
    bringToFront();
    animateWindow(true);
    return;
  }

  let posts = [];
  let currentPostId = localStorage.getItem("dischorse_last_post_id") || null;

  const savedPos = JSON.parse(localStorage.getItem("dischorse_pos")) || {
    top: 100,
    left: 100,
  };
  const savedSize = JSON.parse(localStorage.getItem("dischorse_size")) || {
    width: "950px",
    height: "700px",
  };

  const overlay = document.createElement("div");
  overlay.id = "dischorse-overlay";
  overlay.style.cssText = `position: fixed; inset: 0; pointer-events: none; z-index: 10000; background: rgba(0,0,0,0.01);`;
  forumWindowRef = overlay;

  const emojis = [
    "🐎",
    "🐴",
    "🎠",
    "❤️",
    "🩷",
    "🧡",
    "💛",
    "💚",
    "💙",
    "🩵",
    "💜",
    "🤎",
    "🖤",
    "🩶",
    "🤍",
    "💖",
    "💗",
    "💓",
    "💞",
    "💕",
    "💟",
    "💊",
    "💉",
    "🐬",
  ];

  overlay.innerHTML = `
    <style>
      .forum-window { position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; width: ${savedSize.width}; height: ${savedSize.height}; background: rgba(255,255,255,0.95); border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden; backdrop-filter: blur(20px); font-family: 'Segoe UI', system-ui, sans-serif; pointer-events: auto; opacity: 0; transform: scale(0.9); border: 1px solid rgba(255,255,255,0.4); }
      .forum-header { height: 45px; background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: space-between; padding: 0 15px; cursor: move; user-select: none; }
      .forum-sidebar { width: 300px; background: rgba(248, 250, 252, 0.5); border-right: 1px solid #e2e8f0; overflow-y: auto; flex-shrink: 0; }
      .forum-main { flex-grow: 1; background: white; overflow-y: auto; padding: 40px; position: relative; }
      .topic-card { padding: 18px 20px; cursor: pointer; border-bottom: 1px solid #edf2f7; transition: all 0.2s; border-left: 5px solid transparent; }
      .topic-card:hover { background: #f1f5f9; }
      .topic-card.active { background: #eff6ff; border-left-color: #3b82f6; }
      .profile-sig-icon { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #3b82f6; cursor: pointer; object-fit: contain; background: white; padding: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); flex-shrink: 0; }
      .comment-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
      .forum-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; }
      .forum-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
      .forum-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
      
      .forum-tool-btn { background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: bold; color: #475569; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
      .forum-tool-btn:hover { background: #f1f5f9; color: #1e293b; }
      .forum-tool-btn.active { background: #e0f2fe; border-color: #3b82f6; color: #0369a1; }
      .forum-emoji { cursor: pointer; font-size: 20px; padding: 6px; border-radius: 6px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
      .forum-emoji:hover { background: #f1f5f9; transform: scale(1.15); }
      
      .vista-resize-handle { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.1) 50%); }
      
      /* Poll Styles */
      .poll-option { border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 10px; position: relative; overflow: hidden; background: #fff; transition: 0.2s; }
      .poll-option.votable:hover { border-color: #3b82f6; transform: translateX(2px); }
      .poll-option.voted { border-color: #3b82f6; border-width: 2px; font-weight: bold; }
      .poll-fill { position: absolute; top: 0; left: 0; bottom: 0; background: #e2e8f0; z-index: 0; transition: width 0.4s ease; }
      .poll-option.voted .poll-fill { background: rgba(59, 130, 246, 0.2); }
      .poll-content { position: relative; z-index: 1; padding: 12px 15px; display: flex; justify-content: space-between; color: #1e293b; }
    </style>

    <div class="forum-window">
      <div class="forum-header" id="forum-drag-handle">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="assets/dischorse.png" style="width:24px; height:24px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
          <span style="color:white; font-weight:900; letter-spacing:0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Disc:Horse</span>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <div id="forum-min" style="width: 24px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05)); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; transition: background 0.2s;">
            <div style="width: 10px; height: 2px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.5);"></div>
          </div>
          <div id="forum-close" style="width: 38px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%); cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3);">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));"></path></svg>
          </div>
        </div>
      </div>
      <div style="display:flex; flex-grow:1; overflow:hidden;">
        <div class="forum-sidebar">
          <div style="padding:20px;"><button class="forum-btn" id="new-topic-btn" style="width:100%;">+ New Topic</button></div>
          <div id="topic-list"></div>
        </div>
        <div class="forum-main" id="topic-content"></div>
      </div>
      <div class="vista-resize-handle" id="forum-resizer"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  const win = overlay.querySelector(".forum-window");
  const mainView = overlay.querySelector("#topic-content");
  const topicList = overlay.querySelector("#topic-list");

  // VISTA EXACT WINDOW CONTROLS
  const minBtn = overlay.querySelector("#forum-min");
  const closeBtn = overlay.querySelector("#forum-close");
  minBtn.onmouseenter = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))");
  minBtn.onmouseleave = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))");
  closeBtn.onmouseenter = () =>
    (closeBtn.style.background =
      "linear-gradient(180deg, rgba(255,120,120,0.95) 0%, rgba(230,50,50,1) 49%, rgba(200,20,20,1) 50%, rgba(250,70,70,1) 100%)");
  closeBtn.onmouseleave = () =>
    (closeBtn.style.background =
      "linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%)");

  minBtn.onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false;
    animateWindow(false);
    syncForumTaskbar();
  };

  closeBtn.onclick = (e) => {
    e.stopPropagation();
    localStorage.setItem("dischorse_is_open", "false");
    overlay.remove();
    forumWindowRef = null;
    isAppRunning = false;
    isWindowVisible = false;
    syncForumTaskbar();
  };

  const makeDraggable = (el, handle) => {
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;
    const move = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!wasDragged && (Math.abs(dx) > 2 || Math.abs(dy) > 2))
        wasDragged = true;
      if (wasDragged) {
        el.style.left = initialLeft + dx + "px";
        el.style.top = initialTop + dy + "px";
      }
    };
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      if (wasDragged) {
        localStorage.setItem(
          "dischorse_pos",
          JSON.stringify({ top: el.offsetTop, left: el.offsetLeft }),
        );
        setTimeout(() => {
          wasDragged = false;
        }, 50);
      }
    };
    handle.onmousedown = (e) => {
      if (
        e.target.id === "forum-min" ||
        e.target.id === "forum-close" ||
        e.target.closest("#forum-min") ||
        e.target.closest("#forum-close")
      )
        return;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      wasDragged = false;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    };
  };
  makeDraggable(win, overlay.querySelector("#forum-drag-handle"));

  const renderTopic = (topic) => {
    currentPostId = topic.id;
    localStorage.setItem("dischorse_last_post_id", topic.id);

    // Poll Logic Processing
    let pollHtml = "";
    if (topic.poll && topic.poll.options) {
      const now = new Date();
      const expires = topic.poll.expiresAt
        ? topic.poll.expiresAt.toDate()
        : null;
      const isLocked = expires && now > expires;
      const votes = topic.poll.votes || {};
      const totalVotes = Object.keys(votes).length;
      const userVote = votes[currentUsername];

      let optionsHtml = topic.poll.options
        .map((opt, index) => {
          let optVotes = Object.values(votes).filter((v) => v === index).length;
          let percent =
            totalVotes === 0 ? 0 : Math.round((optVotes / totalVotes) * 100);
          let isVoted = userVote === index;

          return `
          <div class="poll-option ${!isLocked ? "votable" : ""} ${isVoted ? "voted" : ""}" data-index="${index}" style="cursor: ${!isLocked ? "pointer" : "default"};">
            <div class="poll-fill" style="width: ${percent}%;"></div>
            <div class="poll-content">
              <span>${opt}</span>
              <span>${percent}% (${optVotes})</span>
            </div>
          </div>
        `;
        })
        .join("");

      pollHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 40px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <strong style="color: #0f172a; font-size: 16px;">📊 Community Poll</strong>
            <span style="font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 4px; background: ${isLocked ? "#fee2e2" : "#e0f2fe"}; color: ${isLocked ? "#dc2626" : "#0284c7"};">
              ${isLocked ? "🔒 Closed" : expires ? "⏳ Ends " + expires.toLocaleDateString() : "∞ Ongoing"}
            </span>
          </div>
          ${optionsHtml}
          <div style="font-size: 12px; color: #64748b; margin-top: 10px; text-align: right;">Total votes: ${totalVotes}</div>
        </div>
      `;
    }

    mainView.innerHTML = `
      <div style="display:flex; align-items:center; gap:20px; margin-bottom:30px;">
        <img class="profile-sig-icon" id="author-img">
        <div>
          <h1 style="margin:0; font-size:32px; color:#1e293b; letter-spacing:-0.5px;">${topic.title}</h1>
          <span style="font-size:13px; color:#647488;">Started by <strong>${topic.author}</strong></span>
        </div>
      </div>
      <div style="font-size:16px; line-height:1.8; color:#334155; margin-bottom:30px;">${topic.content}</div>
      ${pollHtml}
      
      <h3 style="border-bottom:2px solid #f1f5f9; padding-bottom:12px; margin-bottom:25px; color:#475569; font-weight:800; font-size:18px;">Responses</h3>
      <div id="forum-comments"></div>
      
      <div style="margin-top:40px; background:#f8fafc; padding:25px; border-radius:15px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box; position: relative;">
        
        <div style="display: flex; gap: 8px; margin-bottom: 10px; position: relative;">
          <button class="forum-tool-btn" id="btn-emoji">😀 Emoji</button>
          <button class="forum-tool-btn" id="btn-gif">GIF</button>
          
          <div id="emoji-picker" style="display: none; position: absolute; bottom: 40px; left: 0; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; width: 280px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 200;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${emojis.map((e) => `<div class="forum-emoji">${e}</div>`).join("")}
            </div>
          </div>

          <div id="gif-picker" style="display: none; position: absolute; bottom: 40px; left: 0; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; width: 320px; max-width: 100%; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 200;">
            <input type="text" id="gif-search" placeholder="Search for GIFs..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; margin-bottom: 10px; box-sizing: border-box; outline: none;">
            <div id="gif-results" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 250px; overflow-y: auto; overflow-x: hidden; padding-right: 4px;">
              <div style="grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;">Search to find GIFs...</div>
            </div>
          </div>
        </div>

        <textarea id="forum-reply" style="width:100%; height:120px; border-radius:10px; padding:15px; border:1px solid #cbd5e1; outline:none; font-family:sans-serif; box-sizing: border-box; resize: vertical; display: block;" placeholder="What are your thoughts?"></textarea>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
           <button class="forum-btn" id="forum-submit" style="margin:0;">Post Comment</button>
        </div>
      </div>
    `;

    setupSignatureIcon(topic.author, mainView.querySelector("#author-img"));

    // Toolbar Logic
    const emojiBtn = mainView.querySelector("#btn-emoji");
    const emojiPicker = mainView.querySelector("#emoji-picker");
    const gifBtn = mainView.querySelector("#btn-gif");
    const gifPicker = mainView.querySelector("#gif-picker");
    const replyInput = mainView.querySelector("#forum-reply");
    const gifSearch = mainView.querySelector("#gif-search");
    const gifResults = mainView.querySelector("#gif-results");

    emojiBtn.onclick = () => {
      gifPicker.style.display = "none";
      gifBtn.classList.remove("active");
      const isVisible = emojiPicker.style.display === "block";
      emojiPicker.style.display = isVisible ? "none" : "block";
      if (!isVisible) emojiBtn.classList.add("active");
      else emojiBtn.classList.remove("active");
    };

    gifBtn.onclick = () => {
      emojiPicker.style.display = "none";
      emojiBtn.classList.remove("active");
      const isVisible = gifPicker.style.display === "block";
      gifPicker.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        gifBtn.classList.add("active");
        gifSearch.focus();
      } else gifBtn.classList.remove("active");
    };

    mainView.querySelectorAll(".forum-emoji").forEach((btn) => {
      btn.onclick = () => {
        replyInput.value += btn.innerText;
        emojiPicker.style.display = "none";
        emojiBtn.classList.remove("active");
        replyInput.focus();
      };
    });

    let gifTimeout;
    gifSearch.oninput = (e) => {
      clearTimeout(gifTimeout);
      const query = e.target.value.trim();
      if (!query) {
        gifResults.innerHTML =
          "<div style='grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;'>Search to find GIFs...</div>";
        return;
      }
      gifResults.innerHTML =
        "<div style='grid-column: span 2; text-align: center; color: #64748b; padding: 20px 0;'>Loading...</div>";

      gifTimeout = setTimeout(async () => {
        try {
          // Swapped to Tenor API using their reliable public test key
          const res = await fetch(
            `https://g.tenor.com/v1/search?q=${encodeURIComponent(query + " horse")}&key=LIVDSRZULELA&limit=10`,
          );
          const json = await res.json();
          gifResults.innerHTML = "";

          if (!json.results || json.results.length === 0) {
            gifResults.innerHTML =
              "<div style='grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;'>No results found.</div>";
            return;
          }

          json.results.forEach((gif) => {
            const img = document.createElement("img");
            img.src = gif.media[0].tinygif.url;
            // FIX: Added box-sizing: border-box so the 2px border doesn't break the grid layout
            img.style.cssText =
              "width: 100%; height: 90px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; box-sizing: border-box; transition: 0.2s;";
            img.onmouseenter = () => (img.style.borderColor = "#3b82f6");
            img.onmouseleave = () => (img.style.borderColor = "transparent");
            img.onclick = () => {
              replyInput.value += `\n<img src="${gif.media[0].gif.url}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">\n`;
              gifPicker.style.display = "none";
              gifBtn.classList.remove("active");
              replyInput.focus();
            };
            gifResults.appendChild(img);
          });
        } catch (err) {
          gifResults.innerHTML =
            "<div style='grid-column: span 2; text-align: center; color: #ef4444; padding: 20px 0;'>Error loading GIFs.</div>";
        }
      }, 600);
    };

    // Handle Poll Voting
    if (topic.poll) {
      mainView.querySelectorAll(".poll-option.votable").forEach((optEl) => {
        optEl.onclick = async () => {
          const index = parseInt(optEl.dataset.index);
          const currentVotes = topic.poll.votes || {};
          await updateDoc(doc(db, "wiki_articles", topic.id), {
            "poll.votes": { ...currentVotes, [currentUsername]: index },
          });
        };
      });
    }

    const q = query(
      collection(db, "wiki_comments"),
      where("articleId", "==", topic.id),
      orderBy("timestamp", "asc"),
    );
    onSnapshot(q, (snap) => {
      const container = mainView.querySelector("#forum-comments");
      container.innerHTML = "";
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      all
        .filter((c) => !c.parentId)
        .forEach((com) => {
          const div = document.createElement("div");
          div.className = "comment-box";
          div.innerHTML = `
          <div style="display:flex; gap:15px; align-items:start;">
            <img class="profile-sig-icon" id="sig-${com.id}">
            <div style="flex-grow:1; overflow: hidden;">
              <div style="font-weight:800; font-size:14px; color:#1e293b; margin-bottom:4px;">${com.author}</div>
              <div style="font-size:14.5px; color:#334155; line-height:1.5; word-wrap: break-word;">${com.text}</div>
              <div style="font-size:11px; color:#3b82f6; cursor:pointer; margin-top:12px; font-weight:800; text-transform:uppercase;" class="rep-toggle" data-id="${com.id}">↳ Reply</div>
              <div id="reps-for-${com.id}" style="margin-top:15px; padding-left:15px; border-left:2px solid #e2e8f0;"></div>
              <div id="input-for-${com.id}" style="display:none; margin-top:15px;">
                <textarea id="txt-${com.id}" style="width:100%; height:60px; border-radius:8px; border:1px solid #ddd; padding:10px; outline:none; box-sizing: border-box; resize: vertical;"></textarea>
                <button class="forum-btn" style="padding:6px 15px; font-size:11px; margin-top:8px;" id="btn-${com.id}">Reply</button>
              </div>
            </div>
          </div>
        `;
          container.appendChild(div);
          setupSignatureIcon(com.author, div.querySelector(`#sig-${com.id}`));

          all
            .filter((r) => r.parentId === com.id)
            .forEach((reply) => {
              const rDiv = document.createElement("div");
              rDiv.style.cssText =
                "display:flex; gap:12px; margin-bottom:15px; align-items:start;";
              rDiv.innerHTML = `<img class="profile-sig-icon" style="width:34px; height:34px;" id="sig-${reply.id}"><div style="flex-grow: 1; overflow: hidden;"><div style="font-size:12px; font-weight:800; color:#1e293b;">${reply.author}</div><div style="font-size:13.5px; color:#475569; word-wrap: break-word;">${reply.text}</div></div>`;
              div.querySelector(`#reps-for-${com.id}`).appendChild(rDiv);
              setupSignatureIcon(
                reply.author,
                rDiv.querySelector(`#sig-${reply.id}`),
              );
            });

          div.querySelector(".rep-toggle").onclick = () => {
            const ui = div.querySelector(`#input-for-${com.id}`);
            ui.style.display = ui.style.display === "none" ? "block" : "none";
          };
          div.querySelector(`#btn-${com.id}`).onclick = async () => {
            const t = div.querySelector(`#txt-${com.id}`).value.trim();
            if (!t) return;
            await addDoc(collection(db, "wiki_comments"), {
              articleId: topic.id,
              parentId: com.id,
              author: currentUsername,
              text: t,
              timestamp: serverTimestamp(),
            });
          };
        });
    });

    mainView.querySelector("#forum-submit").onclick = async () => {
      const v = mainView.querySelector("#forum-reply").value.trim();
      if (!v) return;
      // Because we injected raw HTML for the gifs via the value, we can safely save it
      await addDoc(collection(db, "wiki_comments"), {
        articleId: topic.id,
        parentId: null,
        author: currentUsername,
        text: v,
        timestamp: serverTimestamp(),
      });
      mainView.querySelector("#forum-reply").value = "";
    };
  };

  const renderEditor = () => {
    mainView.innerHTML = `
      <h2 style="color:#1e293b; margin-bottom:25px; font-weight:900;">Start a New Topic</h2>
      
      <div style="margin-bottom: 20px;">
        <label style="font-weight:bold; font-size:13px; color:#64748b; display:block; margin-bottom:8px;">Topic Title</label>
        <input type="text" id="new-topic-title" style="width:100%; box-sizing: border-box; padding:15px; border-radius:10px; border:1.5px solid #cbd5e1; font-size:20px; font-weight:700; outline:none;" placeholder="What is the title of your topic?">
      </div>

      <div style="margin-bottom: 20px;">
        <label style="font-weight:bold; font-size:13px; color:#64748b; display:block; margin-bottom:8px;">Message</label>
        
        <div style="display: flex; gap: 8px; margin-bottom: 10px; position: relative;">
          <button class="forum-tool-btn" data-cmd="bold"><b>B</b></button>
          <button class="forum-tool-btn" data-cmd="italic"><i>I</i></button>
          <button class="forum-tool-btn" data-cmd="formatBlock" data-val="H2">H2</button>
          <button class="forum-tool-btn" data-cmd="formatBlock" data-val="H3">H3</button>
          <div style="width: 1px; background: #cbd5e1; margin: 0 4px;"></div>
          <button class="forum-tool-btn" id="editor-btn-emoji">😀 Emoji</button>
          <button class="forum-tool-btn" id="editor-btn-gif">GIF</button>
          
          <div id="editor-emoji-picker" style="display: none; position: absolute; top: 40px; left: 200px; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; width: 280px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 200;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${emojis.map((e) => `<div class="forum-emoji-ed" style="cursor:pointer; font-size:20px; padding:6px; border-radius:6px; transition:0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.transform='scale(1.15)';" onmouseout="this.style.background='transparent'; this.style.transform='scale(1)';">${e}</div>`).join("")}
            </div>
          </div>

          <div id="editor-gif-picker" style="display: none; position: absolute; top: 40px; left: 260px; background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; width: 320px; max-width: 100%; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 200;">
            <input type="text" id="editor-gif-search" placeholder="Search for GIFs..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ccc; margin-bottom: 10px; box-sizing: border-box; outline: none;">
            <div id="editor-gif-results" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 250px; overflow-y: auto; overflow-x: hidden; padding-right: 4px;">
              <div style="grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;">Search to find GIFs...</div>
            </div>
          </div>
        </div>

        <div id="new-topic-body" contenteditable="true" style="width:100%; box-sizing: border-box; min-height:200px; border:1.5px solid #cbd5e1; border-radius:10px; padding:15px; background:white; outline:none; font-size:16px; line-height:1.6;" placeholder="Share your message with the herd..."></div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
          <h3 style="margin:0; font-size:16px; color:#0f172a;">📊 Add a Poll (Optional)</h3>
        </div>
        
        <div style="display: grid; gap: 10px; margin-bottom: 15px;">
          <input type="text" class="poll-input" placeholder="Option 1" style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
          <input type="text" class="poll-input" placeholder="Option 2" style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
          <input type="text" class="poll-input" placeholder="Option 3 (Optional)" style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
          <input type="text" class="poll-input" placeholder="Option 4 (Optional)" style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
        </div>

        <label style="font-weight:bold; font-size:13px; color:#64748b; display:block; margin-bottom:8px;">Poll Duration</label>
        <select id="poll-duration" style="width:100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; font-size: 14px;">
          <option value="0">Infinite (Never locks)</option>
          <option value="1">1 Hour</option>
          <option value="24">24 Hours</option>
          <option value="168">7 Days</option>
        </select>
      </div>

      <div style="display:flex; gap:12px;">
        <button class="forum-btn" id="save-topic">Create Topic</button>
        <button class="forum-btn" id="cancel-topic" style="background:#94a3b8;">Cancel</button>
      </div>
    `;

    const editorBody = mainView.querySelector("#new-topic-body");

    // Formatting Buttons Logic
    mainView.querySelectorAll(".forum-tool-btn[data-cmd]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        editorBody.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      };
    });

    // Toolbar Pickers Logic
    const emojiBtn = mainView.querySelector("#editor-btn-emoji");
    const emojiPicker = mainView.querySelector("#editor-emoji-picker");
    const gifBtn = mainView.querySelector("#editor-btn-gif");
    const gifPicker = mainView.querySelector("#editor-gif-picker");
    const gifSearch = mainView.querySelector("#editor-gif-search");
    const gifResults = mainView.querySelector("#editor-gif-results");

    emojiBtn.onclick = () => {
      gifPicker.style.display = "none";
      gifBtn.classList.remove("active");
      const isVisible = emojiPicker.style.display === "block";
      emojiPicker.style.display = isVisible ? "none" : "block";
      if (!isVisible) emojiBtn.classList.add("active");
      else emojiBtn.classList.remove("active");
    };

    gifBtn.onclick = () => {
      emojiPicker.style.display = "none";
      emojiBtn.classList.remove("active");
      const isVisible = gifPicker.style.display === "block";
      gifPicker.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        gifBtn.classList.add("active");
        gifSearch.focus();
      } else gifBtn.classList.remove("active");
    };

    mainView.querySelectorAll(".forum-emoji-ed").forEach((btn) => {
      btn.onclick = () => {
        editorBody.focus();
        document.execCommand("insertText", false, btn.innerText);
        emojiPicker.style.display = "none";
        emojiBtn.classList.remove("active");
      };
    });

    let gifTimeout;
    gifSearch.oninput = (e) => {
      clearTimeout(gifTimeout);
      const query = e.target.value.trim();
      if (!query) {
        gifResults.innerHTML =
          "<div style='grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;'>Search to find GIFs...</div>";
        return;
      }
      gifResults.innerHTML =
        "<div style='grid-column: span 2; text-align: center; color: #64748b; padding: 20px 0;'>Loading...</div>";

      gifTimeout = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://g.tenor.com/v1/search?q=${encodeURIComponent(query + " horse")}&key=LIVDSRZULELA&limit=10`,
          );
          const json = await res.json();
          gifResults.innerHTML = "";

          if (!json.results || json.results.length === 0) {
            gifResults.innerHTML =
              "<div style='grid-column: span 2; text-align: center; color: #94a3b8; padding: 20px 0;'>No results found.</div>";
            return;
          }

          json.results.forEach((gif) => {
            const img = document.createElement("img");
            img.src = gif.media[0].tinygif.url;
            img.style.cssText =
              "width: 100%; height: 90px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; box-sizing: border-box; transition: 0.2s;";
            img.onmouseenter = () => (img.style.borderColor = "#3b82f6");
            img.onmouseleave = () => (img.style.borderColor = "transparent");
            img.onclick = () => {
              editorBody.focus();
              document.execCommand(
                "insertHTML",
                false,
                `<br><img src="${gif.media[0].gif.url}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;"><br>`,
              );
              gifPicker.style.display = "none";
              gifBtn.classList.remove("active");
            };
            gifResults.appendChild(img);
          });
        } catch (err) {
          gifResults.innerHTML =
            "<div style='grid-column: span 2; text-align: center; color: #ef4444; padding: 20px 0;'>Error loading GIFs.</div>";
        }
      }, 600);
    };

    mainView.querySelector("#save-topic").onclick = async () => {
      const t = mainView.querySelector("#new-topic-title").value.trim();
      const b = editorBody.innerHTML.trim();
      if (!t || !b)
        return alert("Please fill in both the title and message fields.");

      // Process Poll
      const pollInputs = Array.from(mainView.querySelectorAll(".poll-input"))
        .map((input) => input.value.trim())
        .filter((val) => val !== "");
      let pollData = null;

      if (pollInputs.length === 1) {
        return alert("A poll requires at least 2 options.");
      } else if (pollInputs.length >= 2) {
        const hours = parseInt(mainView.querySelector("#poll-duration").value);
        let expiresAt = null;
        if (hours > 0) {
          expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        }
        pollData = {
          options: pollInputs,
          votes: {},
          expiresAt: expiresAt,
        };
      }

      const docRef = await addDoc(collection(db, "wiki_articles"), {
        title: t,
        content: b,
        section: "community",
        author: currentUsername,
        createdAt: serverTimestamp(),
        poll: pollData,
      });
      renderTopic({
        id: docRef.id,
        title: t,
        content: b,
        author: currentUsername,
        poll: pollData,
      });
    };

    mainView.querySelector("#cancel-topic").onclick = () =>
      posts.length > 0 ? renderTopic(posts[0]) : (mainView.innerHTML = "");
  };

  overlay.querySelector("#new-topic-btn").onclick = renderEditor;

  onSnapshot(
    query(collection(db, "wiki_articles"), where("section", "==", "community")),
    (snap) => {
      posts = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

      topicList.innerHTML = "";
      posts.forEach((p) => {
        const card = document.createElement("div");
        card.className = `topic-card ${p.id === currentPostId ? "active" : ""}`;
        card.innerHTML = `<div style="font-weight:900; color:#1e293b; font-size:14px; margin-bottom:4px;">${p.title}</div><div style="font-size:11px; color:#647488; font-weight:600;">By ${p.author} ${p.poll ? "📊" : ""}</div>`;
        card.onclick = () => renderTopic(p);
        topicList.appendChild(card);
      });

      if (!currentPostId && posts.length > 0) renderTopic(posts[0]);
      else if (currentPostId) {
        const cur = posts.find((p) => p.id === currentPostId);
        if (cur) renderTopic(cur);
      }
    },
  );

  bringToFront();
  animateWindow(true);
}

export function initDiscHorse(db, currentUsername, userRole) {
  if (!currentUsername) return;

  onSnapshot(collection(db, "policy_signatures"), (snap) => {
    globalSignatures = snap.docs.map((d) => d.data());
  });

  const icon = document.createElement("div");
  icon.id = "dischorse-icon";
  icon.style.cssText = `position:fixed; top:75%; right:10%; cursor:pointer; z-index:11000; display:flex; flex-direction:column; align-items:center; transition:0.2s;`;
  icon.innerHTML = `<img src="assets/dischorse.png" style="width:55px; height:55px; filter:drop-shadow(2px 4px 10px rgba(0,0,0,0.4));"><div style="color:white; font-size:14px; text-shadow:1px 1px 2px black; margin-top:5px; font-family: serif;">Disc:Horse</div>`;
  icon.onmouseenter = () => (icon.style.transform = "scale(1.15)");
  icon.onmouseleave = () => (icon.style.transform = "scale(1)");
  icon.onclick = () => openForum(db, currentUsername, userRole);
  document.body.appendChild(icon);
  if (localStorage.getItem("dischorse_is_open") === "true")
    openForum(db, currentUsername, userRole);
}
