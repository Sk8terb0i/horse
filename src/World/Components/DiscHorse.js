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
import "./dischorse.css"; // IMPORTANT: Import your new CSS file

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
  // Apply the Z-index to the OVERLAY (the parent container)
  window.__highestVistaZIndex =
    Math.max(window.__highestVistaZIndex || 0, 12000) + 1;
  forumWindowRef.style.zIndex = window.__highestVistaZIndex;
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

const isSignificantEdit = (oldStr, newStr) => {
  if (Math.abs(oldStr.length - newStr.length) > 5) return true;
  if (oldStr === newStr) return false;
  if (oldStr.length > 2500) return true;

  let m = [];
  for (let i = 0; i <= newStr.length; i++) m[i] = [i];
  for (let j = 0; j <= oldStr.length; j++) m[0][j] = j;
  for (let i = 1; i <= newStr.length; i++) {
    for (let j = 1; j <= oldStr.length; j++) {
      if (newStr.charAt(i - 1) === oldStr.charAt(j - 1))
        m[i][j] = m[i - 1][j - 1];
      else
        m[i][j] = Math.min(
          m[i - 1][j - 1] + 1,
          m[i][j - 1] + 1,
          m[i - 1][j] + 1,
        );
    }
  }
  return m[newStr.length][oldStr.length] > 5;
};

const openSignaturePicker = (username, currentImgElement) => {
  const userSigs = globalSignatures.filter((s) => s.username === username);
  if (userSigs.length === 0) return;

  const picker = document.createElement("div");
  picker.className = "sig-picker-overlay";

  picker.innerHTML = `
    <div class="sig-picker-modal">
      <h3 class="sig-picker-title">Select Your Horse</h3>
      <div id="sig-grid" class="sig-picker-grid"></div>
      <button id="close-picker" class="forum-btn sig-picker-close-btn cancel-btn">Cancel</button>
    </div>
  `;

  const grid = picker.querySelector("#sig-grid");
  userSigs.forEach((sigData) => {
    const img = document.createElement("img");
    img.src = sigData.drawing;
    img.className = "sig-picker-img";
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
  imgElement.className = "setup-sig-icon";
  imgElement.onclick = (e) => {
    e.stopPropagation();
    openSignaturePicker(username, imgElement);
  };
};

const makeResizable = (el, handle, saveKey) => {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  const doResize = (e) => {
    if (!isResizing) return;
    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);
    if (newWidth >= 500) el.style.width = newWidth + "px";
    if (newHeight >= 400) el.style.height = newHeight + "px";
  };

  const stopResize = () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
      if (saveKey)
        localStorage.setItem(
          saveKey,
          JSON.stringify({ width: el.style.width, height: el.style.height }),
        );
    }
  };

  handle.onmousedown = (e) => {
    e.stopPropagation();
    isResizing = true;
    document.body.style.userSelect = "none";
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(el).width, 10);
    startHeight = parseInt(
      document.defaultView.getComputedStyle(el).height,
      10,
    );
    document.addEventListener("mousemove", doResize);
    document.addEventListener("mouseup", stopResize);
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
    <div class="forum-window" style="top: ${savedPos.top}px; left: ${savedPos.left}px; width: ${savedSize.width}; height: ${savedSize.height};">
      <div class="forum-header" id="forum-drag-handle">
        <div class="forum-header-left">
          <img src="assets/dischorse.png" class="forum-header-icon">
          <span class="forum-header-title">Disc:Horse</span>
        </div>
        <div class="forum-header-right">
          <div id="forum-min">
            <div class="forum-min-line"></div>
          </div>
          <div id="forum-close">
            <svg width="10" height="10" viewBox="0 0 10 10" class="forum-close-icon"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round"></path></svg>
          </div>
        </div>
      </div>
      <div class="forum-body-container">
        <div class="forum-sidebar">
          <div class="forum-sidebar-padding">
            <button class="forum-btn full-width" id="new-topic-btn">+ NEW TOPIC</button>
          </div>
          <div id="topic-list"></div>
        </div>
        <div class="forum-main" id="topic-content"></div>
      </div>
      <div class="dischorse-resize-handle" id="forum-resizer"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  const win = overlay.querySelector(".forum-window");

  // FIX: Trigger bringToFront on the window's mousedown
  win.addEventListener("mousedown", (e) => {
    bringToFront();
  });

  // Call it immediately on open
  bringToFront();
  const mainView = overlay.querySelector("#topic-content");
  const topicList = overlay.querySelector("#topic-list");

  const minBtn = overlay.querySelector("#forum-min");
  const closeBtn = overlay.querySelector("#forum-close");
  const resizer = overlay.querySelector("#forum-resizer");
  makeResizable(win, resizer, "dischorse_size");

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

  const bindEditComment = (id, originalText, isAlreadyEdited) => {
    const editToggle = mainView.querySelector(`.edit-toggle[data-id="${id}"]`);
    if (!editToggle) return;

    const displayDiv = mainView.querySelector(`#text-display-${id}`);
    const editContainer = mainView.querySelector(`#edit-input-for-${id}`);
    const textarea = mainView.querySelector(`#edit-txt-${id}`);
    const saveBtn = mainView.querySelector(`#save-edit-${id}`);
    const cancelBtn = mainView.querySelector(`#cancel-edit-${id}`);

    editToggle.onclick = () => {
      displayDiv.style.display = "none";
      editContainer.style.display = "block";
    };

    cancelBtn.onclick = () => {
      displayDiv.style.display = "block";
      editContainer.style.display = "none";
      textarea.value = originalText;
    };

    saveBtn.onclick = async () => {
      const newText = textarea.value.trim();
      if (!newText) return;
      const isEdited =
        isAlreadyEdited || isSignificantEdit(originalText, newText);
      await updateDoc(doc(db, "wiki_comments", id), {
        text: newText,
        isEdited,
      });
    };
  };

  const updateSidebarHighlight = () => {
    if (!topicList) return;
    topicList.querySelectorAll(".topic-card").forEach((card) => {
      if (card.dataset.id === currentPostId) card.classList.add("active");
      else card.classList.remove("active");
    });
  };

  const renderTopic = (topic) => {
    currentPostId = topic.id;
    localStorage.setItem("dischorse_last_post_id", topic.id);
    updateSidebarHighlight();

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
        <div class="poll-container">
          <div class="poll-header">
            <strong class="poll-title">📊 Community Poll</strong>
            <span class="poll-status-tag ${isLocked ? "locked" : "open"}">
              ${isLocked ? "🔒 Closed" : expires ? "⏳ Ends " + expires.toLocaleDateString() : "∞ Ongoing"}
            </span>
          </div>
          ${optionsHtml}
          <div class="poll-total-votes">Total votes: ${totalVotes}</div>
        </div>
      `;
    }

    const canEditTopic =
      topic.author === currentUsername || userRole === "admin";
    const canDeleteTopic = userRole === "admin";
    const topicEditedTag = topic.isEdited
      ? '<span class="edited-tag">(edited)</span>'
      : "";

    mainView.innerHTML = `
      <div class="topic-view-header">
        <div class="topic-view-author-box">
          <img class="profile-sig-icon" id="author-img">
          <div>
            <h1 class="topic-view-title">${topic.title}</h1>
            <span class="topic-view-meta">Started by <strong>${topic.author}</strong> ${topicEditedTag}</span>
          </div>
        </div>
        <div class="topic-view-actions">
          ${canEditTopic ? `<div id="edit-topic-btn" class="action-text-btn">Edit</div>` : ""}
          ${canDeleteTopic ? `<div id="delete-topic-btn" class="action-text-btn delete-text-btn">Delete</div>` : ""}
        </div>
      </div>
      
      <div class="topic-view-body">${topic.content}</div>
      ${pollHtml}
      
      <h3 class="responses-header">Responses</h3>
      <div id="forum-comments"></div>
      
      <div class="reply-area-container">
        <div class="reply-toolbar">
          <button class="forum-tool-btn" id="btn-emoji">😀 Emoji</button>
          <button class="forum-tool-btn" id="btn-gif">GIF</button>
          
          <div id="emoji-picker" class="emoji-picker">
            <div class="emoji-picker-grid">
              ${emojis.map((e) => `<div class="forum-emoji">${e}</div>`).join("")}
            </div>
          </div>

          <div id="gif-picker" class="gif-picker">
            <input type="text" id="gif-search" class="gif-search-input" placeholder="Search for GIFs...">
            <div id="gif-results" class="gif-results-grid">
              <div class="gif-status-text">Search to find GIFs...</div>
            </div>
          </div>
        </div>

        <textarea id="forum-reply" class="reply-textarea main-reply" placeholder="What are your thoughts?"></textarea>
        <div class="reply-actions-row">
           <button class="forum-btn" id="forum-submit" style="margin:0;">Post Comment</button>
        </div>
      </div>
    `;

    setupSignatureIcon(topic.author, mainView.querySelector("#author-img"));

    if (canEditTopic) {
      mainView.querySelector("#edit-topic-btn").onclick = () =>
        renderEditor(topic);
    }

    if (canDeleteTopic) {
      mainView.querySelector("#delete-topic-btn").onclick = async () => {
        if (
          confirm(
            `Are you sure you want to delete the entire topic "${topic.title}"?`,
          )
        ) {
          await deleteDoc(doc(db, "wiki_articles", topic.id));
          currentPostId = null;
          localStorage.removeItem("dischorse_last_post_id");
          mainView.innerHTML =
            '<div style="text-align:center; margin-top:100px; color:#94a3b8;">Topic deleted. Select a topic to start galloping.</div>';
        }
      };
    }

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

    // Emoji/GIF insertion
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
          "<div class='gif-status-text'>Search to find GIFs...</div>";
        return;
      }
      gifResults.innerHTML =
        "<div class='gif-status-text loading'>Loading...</div>";

      gifTimeout = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://g.tenor.com/v1/search?q=${encodeURIComponent(query + " horse")}&key=LIVDSRZULELA&limit=10`,
          );
          const json = await res.json();
          gifResults.innerHTML = "";

          if (!json.results || json.results.length === 0) {
            gifResults.innerHTML =
              "<div class='gif-status-text'>No results found.</div>";
            return;
          }

          json.results.forEach((gif) => {
            const img = document.createElement("img");
            img.src = gif.media[0].tinygif.url;
            img.className = "gif-result-img";
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
            "<div class='gif-status-text error'>Error loading GIFs.</div>";
        }
      }, 600);
    };

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

          const canEditCom =
            com.author === currentUsername || userRole === "admin";
          const editedTag = com.isEdited
            ? '<span class="edited-tag small">(edited)</span>'
            : "";

          div.innerHTML = `
          <div class="comment-layout">
            <img class="profile-sig-icon" id="sig-${com.id}">
            <div class="comment-content">
              <div class="comment-header">
                <div class="comment-author">${com.author} ${editedTag}</div>
                ${userRole === "admin" ? `<div class="del-btn" data-id="${com.id}">×</div>` : ""}
              </div>
              
              <div id="text-display-${com.id}" class="comment-text">${com.text}</div>
              
              <div id="edit-input-for-${com.id}" class="edit-input-container">
                 <textarea id="edit-txt-${com.id}" class="reply-textarea com-edit">${com.text}</textarea>
                 <div class="edit-actions">
                   <button class="forum-btn small-btn" id="save-edit-${com.id}">Save</button>
                   <button class="forum-btn small-btn cancel-btn" id="cancel-edit-${com.id}">Cancel</button>
                 </div>
              </div>

              <div class="comment-actions">
                <div class="action-text-btn blue-text-btn rep-toggle" data-id="${com.id}">↳ Reply</div>
                ${canEditCom ? `<div class="action-text-btn edit-toggle" data-id="${com.id}">Edit</div>` : ""}
              </div>
              
              <div id="reps-for-${com.id}" class="replies-container"></div>
              
              <div id="input-for-${com.id}" class="reply-input-container">
                <textarea id="txt-${com.id}" class="reply-textarea rep-input"></textarea>
                <button class="forum-btn small-btn mt-8" id="btn-${com.id}">Post Reply</button>
              </div>
            </div>
          </div>
        `;
          container.appendChild(div);
          setupSignatureIcon(com.author, div.querySelector(`#sig-${com.id}`));
          bindEditComment(com.id, com.text, com.isEdited);

          if (userRole === "admin") {
            const delBtn = div.querySelector(".del-btn");
            if (delBtn)
              delBtn.onclick = async () => {
                if (confirm("Delete comment?"))
                  await deleteDoc(doc(db, "wiki_comments", com.id));
              };
          }

          all
            .filter((r) => r.parentId === com.id)
            .forEach((reply) => {
              const rDiv = document.createElement("div");
              const canEditRep =
                reply.author === currentUsername || userRole === "admin";
              const repEditedTag = reply.isEdited
                ? '<span class="edited-tag small">(edited)</span>'
                : "";

              rDiv.className = "comment-layout reply";
              rDiv.innerHTML = `
            <img class="profile-sig-icon small" id="sig-${reply.id}">
            <div class="comment-content">
              <div class="comment-header">
                <div class="comment-author small">${reply.author} ${repEditedTag}</div>
                ${userRole === "admin" ? `<div class="del-btn small del-rep" data-id="${reply.id}">×</div>` : ""}
              </div>
              
              <div id="text-display-${reply.id}" class="comment-text small">${reply.text}</div>
              
              <div id="edit-input-for-${reply.id}" class="edit-input-container">
                 <textarea id="edit-txt-${reply.id}" class="reply-textarea rep-edit">${reply.text}</textarea>
                 <div class="edit-actions">
                   <button class="forum-btn x-small-btn" id="save-edit-${reply.id}">Save</button>
                   <button class="forum-btn x-small-btn cancel-btn" id="cancel-edit-${reply.id}">Cancel</button>
                 </div>
              </div>

              ${canEditRep ? `<div class="action-text-btn x-small edit-toggle" data-id="${reply.id}">Edit</div>` : ""}
            </div>
          `;
              div.querySelector(`#reps-for-${com.id}`).appendChild(rDiv);
              setupSignatureIcon(
                reply.author,
                rDiv.querySelector(`#sig-${reply.id}`),
              );
              bindEditComment(reply.id, reply.text, reply.isEdited);

              if (userRole === "admin") {
                const delRepBtn = rDiv.querySelector(".del-rep");
                if (delRepBtn)
                  delRepBtn.onclick = async () => {
                    if (confirm("Delete reply?"))
                      await deleteDoc(doc(db, "wiki_comments", reply.id));
                  };
              }
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

  const renderEditor = (existingTopic = null) => {
    const isNew = !existingTopic;
    const initTitle = isNew ? "" : existingTopic.title;
    const initBody = isNew ? "" : existingTopic.content;
    const headerTitle = isNew ? "Start a New Topic" : "Edit Topic";

    mainView.innerHTML = `
      <h2 class="editor-header">${headerTitle}</h2>
      
      <div class="editor-field-group">
        <label class="editor-label">Topic Title</label>
        <input type="text" id="new-topic-title" value="${initTitle}" class="editor-input" placeholder="What is the title of your topic?">
      </div>

      <div class="editor-field-group">
        <label class="editor-label">Message</label>
        
        <div class="editor-toolbar">
          <button class="forum-tool-btn" data-cmd="bold"><b>B</b></button>
          <button class="forum-tool-btn" data-cmd="italic"><i>I</i></button>
          <button class="forum-tool-btn" data-cmd="formatBlock" data-val="H2">H2</button>
          <button class="forum-tool-btn" data-cmd="formatBlock" data-val="H3">H3</button>
          <div class="toolbar-divider"></div>
          <button class="forum-tool-btn" id="editor-btn-emoji">😀 Emoji</button>
          <button class="forum-tool-btn" id="editor-btn-gif">GIF</button>
          
          <div id="editor-emoji-picker" class="emoji-picker editor-mode">
            <div class="emoji-picker-grid">
              ${emojis.map((e) => `<div class="forum-emoji-ed">${e}</div>`).join("")}
            </div>
          </div>

          <div id="editor-gif-picker" class="gif-picker editor-mode">
            <input type="text" id="editor-gif-search" class="gif-search-input" placeholder="Search for GIFs...">
            <div id="editor-gif-results" class="gif-results-grid">
              <div class="gif-status-text">Search to find GIFs...</div>
            </div>
          </div>
        </div>

        <div id="new-topic-body" contenteditable="true" class="editor-body" placeholder="Share your message with the herd...">${initBody}</div>
      </div>

      ${
        isNew
          ? `
      <div class="poll-creator-container">
        <div class="poll-creator-header">
          <h3 class="poll-creator-title">📊 Add a Poll (Optional)</h3>
        </div>
        
        <div class="poll-creator-grid">
          <input type="text" class="poll-input" placeholder="Option 1">
          <input type="text" class="poll-input" placeholder="Option 2">
          <input type="text" class="poll-input" placeholder="Option 3 (Optional)">
          <input type="text" class="poll-input" placeholder="Option 4 (Optional)">
        </div>

        <label class="editor-label">Poll Duration</label>
        <select id="poll-duration" class="poll-select">
          <option value="0">Infinite (Never locks)</option>
          <option value="1">1 Hour</option>
          <option value="24">24 Hours</option>
          <option value="168">7 Days</option>
        </select>
      </div>`
          : ""
      }

      <div class="editor-actions-row">
        <button class="forum-btn" id="save-topic">${isNew ? "Create Topic" : "Save Changes"}</button>
        <button class="forum-btn cancel-btn" id="cancel-topic">Cancel</button>
      </div>
    `;

    const editorBody = mainView.querySelector("#new-topic-body");

    mainView.querySelectorAll(".forum-tool-btn[data-cmd]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        editorBody.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      };
    });

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
          "<div class='gif-status-text'>Search to find GIFs...</div>";
        return;
      }
      gifResults.innerHTML =
        "<div class='gif-status-text loading'>Loading...</div>";

      gifTimeout = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://g.tenor.com/v1/search?q=${encodeURIComponent(query + " horse")}&key=LIVDSRZULELA&limit=10`,
          );
          const json = await res.json();
          gifResults.innerHTML = "";

          if (!json.results || json.results.length === 0) {
            gifResults.innerHTML =
              "<div class='gif-status-text'>No results found.</div>";
            return;
          }

          json.results.forEach((gif) => {
            const img = document.createElement("img");
            img.src = gif.media[0].tinygif.url;
            img.className = "gif-result-img";
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
            "<div class='gif-status-text error'>Error loading GIFs.</div>";
        }
      }, 600);
    };

    mainView.querySelector("#save-topic").onclick = async () => {
      const t = mainView.querySelector("#new-topic-title").value.trim();
      const b = editorBody.innerHTML.trim();
      if (!t || !b)
        return alert("Please fill in both the title and message fields.");

      if (isNew) {
        const pollInputs = Array.from(mainView.querySelectorAll(".poll-input"))
          .map((input) => input.value.trim())
          .filter((val) => val !== "");
        let pollData = null;

        if (pollInputs.length === 1) {
          return alert("A poll requires at least 2 options.");
        } else if (pollInputs.length >= 2) {
          const hours = parseInt(
            mainView.querySelector("#poll-duration").value,
          );
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
          isEdited: false,
        });
        renderTopic({
          id: docRef.id,
          title: t,
          content: b,
          author: currentUsername,
          poll: pollData,
          isEdited: false,
        });
      } else {
        const isEdited =
          existingTopic.isEdited ||
          isSignificantEdit(existingTopic.content, b) ||
          isSignificantEdit(existingTopic.title, t);
        await updateDoc(doc(db, "wiki_articles", existingTopic.id), {
          title: t,
          content: b,
          isEdited: isEdited,
        });
        renderTopic({
          ...existingTopic,
          title: t,
          content: b,
          isEdited: isEdited,
        });
      }
    };

    mainView.querySelector("#cancel-topic").onclick = () => {
      if (existingTopic) renderTopic(existingTopic);
      else if (posts.length > 0) renderTopic(posts[0]);
      else mainView.innerHTML = "";
    };
  };

  overlay.querySelector("#new-topic-btn").onclick = () => renderEditor(null);

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
        card.dataset.id = p.id;
        card.innerHTML = `<div class="topic-card-title">${p.title}</div><div class="topic-card-meta">By ${p.author} ${p.poll ? "📊" : ""}</div>`;
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

  const savedIconPos = JSON.parse(
    localStorage.getItem("dischorse_icon_pos"),
  ) || { left: "85vw", top: "10vh" };
  const getPos = (val) => (typeof val === "number" ? val + "px" : val);

  const icon = document.createElement("div");
  icon.id = "dischorse-icon";
  icon.style.cssText = `position: fixed; left: ${getPos(savedIconPos.left)}; top: ${getPos(savedIconPos.top)}; z-index: 5000; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;

  icon.innerHTML = `
    <img src="assets/dischorse.png" class="dischorse-icon-img" style="pointer-events: none;">
    <div class="dischorse-icon-text" style="pointer-events: none;">Disc:Horse</div>
  `;

  document.body.appendChild(icon);

  const makeIconDraggable = (iconEl, saveKey, clickCallback) => {
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;

    iconEl.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      document.body.style.userSelect = "none";

      startX = e.clientX;
      startY = e.clientY;
      const rect = iconEl.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      isDragging = true;
      wasDragged = false;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          wasDragged = true;
          iconEl.style.transition = "none";
        }

        if (wasDragged) {
          iconEl.style.left = initialLeft + dx + "px";
          iconEl.style.top = initialTop + dy + "px";
          iconEl.style.right = "auto";
          iconEl.style.bottom = "auto";
        }
      };

      const onMouseUp = (upEvent) => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (wasDragged) {
          iconEl.style.transition =
            "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
          const finalRect = iconEl.getBoundingClientRect();
          const safeLeft = Math.max(
            0,
            Math.min(finalRect.left, window.innerWidth - 64),
          );
          const safeTop = Math.max(
            0,
            Math.min(finalRect.top, window.innerHeight - 64),
          );

          const vwPos = (safeLeft / window.innerWidth) * 100;
          const vhPos = (safeTop / window.innerHeight) * 100;

          const relativePos = { left: vwPos + "vw", top: vhPos + "vh" };
          iconEl.style.left = relativePos.left;
          iconEl.style.top = relativePos.top;

          localStorage.setItem(saveKey, JSON.stringify(relativePos));
        } else {
          if (clickCallback) clickCallback(e);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  };

  makeIconDraggable(icon, "dischorse_icon_pos", () => {
    openForum(db, currentUsername, userRole);
  });

  if (localStorage.getItem("dischorse_is_open") === "true") {
    openForum(db, currentUsername, userRole);
  }
}
