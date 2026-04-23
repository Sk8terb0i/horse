import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc, // <-- ADD THIS
} from "firebase/firestore";

let wikiWindowRef = null;
let isAppRunning = false;
let isWindowVisible = false;

function syncWikiTaskbar() {
  if (window.TaskbarAPI) {
    window.TaskbarAPI.updateApp(
      "wiki-kb",
      "Horse Knowledge Base",
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='4' y='4' width='24' height='24' rx='3' fill='%230072ff'/%3E%3Crect x='4' y='4' width='8' height='24' rx='3' fill='%2300fbff' opacity='0.5'/%3E%3Cpath stroke='%23fff' stroke-width='2' stroke-linecap='round' d='M16 12h6M16 16h6M16 20h6'/%3E%3C/svg%3E",
      isAppRunning,
      isWindowVisible,
      () => {
        isWindowVisible = !isWindowVisible;
        if (wikiWindowRef) {
          wikiWindowRef.style.display = isWindowVisible ? "block" : "none";
          if (isWindowVisible) {
            window.__highestVistaZIndex =
              (window.__highestVistaZIndex || 10000) + 1;
            wikiWindowRef.style.zIndex = window.__highestVistaZIndex;
          }
        }
        syncWikiTaskbar();
      },
    );
  }
}

function openWikiOverlay(db, currentUsername, userRole) {
  isAppRunning = true;
  isWindowVisible = true;
  syncWikiTaskbar();

  if (wikiWindowRef) {
    wikiWindowRef.style.display = "block";
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 10000) + 1;
    wikiWindowRef.style.zIndex = window.__highestVistaZIndex;
    return;
  }

  let currentSection = "lore";
  let articles = [];
  let activeSuggestions = []; // NEW: Local cache for suggestions
  let currentArticleId = null;
  let currentSelectionData = null; // NEW: Stores highlighted text for suggestion

  const savedWindowPos = JSON.parse(
    localStorage.getItem("wiki_window_pos"),
  ) || {
    top: Math.max(50, window.innerHeight / 2 - 300),
    left: Math.max(50, window.innerWidth / 2 - 400),
  };

  const savedWindowSize = JSON.parse(
    localStorage.getItem("wiki_window_size"),
  ) || {
    width: "850px",
    height: "650px",
  };

  const overlay = document.createElement("div");
  overlay.id = "wiki-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; pointer-events: auto;
    z-index: 10000; display: block; font-family: 'Segoe UI', Tahoma, sans-serif;
    background: rgba(0,0,0,0.01);
  `;
  wikiWindowRef = overlay;

  overlay.innerHTML = `
    <style>
      .wiki-window {
        position: fixed; top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px;
        width: ${savedWindowSize.width}; height: ${savedWindowSize.height};
        min-width: 500px; min-height: 400px; max-width: 100vw; max-height: 100vh;
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 8px;
        display: flex; flex-direction: column; pointer-events: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.4), inset 0 0 15px rgba(255,255,255,0.5);
        overflow: hidden; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      }
      .wiki-title-bar {
        height: 35px; background: linear-gradient(to bottom, #00fbff 0%, #0072ff 50%, #0059b3 100%);
        display: flex; align-items: center; justify-content: space-between; padding: 0 15px;
        border-bottom: 1px solid #003366; cursor: move; user-select: none; flex-shrink: 0;
      }
      .wiki-nav { display: flex; background: rgba(255,255,255,0.8); border-bottom: 1px solid #ccc; flex-shrink: 0; }
      .wiki-tab { padding: 10px 20px; cursor: pointer; font-weight: bold; color: #444; transition: background 0.2s; border-right: 1px solid #ccc; }
      .wiki-tab.active { background: #fff; color: #0072ff; box-shadow: inset 0 3px 0 #0072ff; }
      .wiki-content { display: flex; flex-grow: 1; overflow: hidden; background: #fff; position: relative; }
      .wiki-sidebar { width: 250px; background: #f0f4f8; border-right: 1px solid #ccc; overflow-y: auto; padding: 10px 5px; flex-shrink: 0; }
      .wiki-article-view { flex-grow: 1; padding: 30px 40px; overflow-y: auto; color: #222; font-size: 15px; line-height: 1.6; display: flex; flex-direction: column; position: relative; }
      
      .obsidian-link { color: #0072ff; text-decoration: none; font-weight: 600; cursor: pointer; background: rgba(0, 114, 255, 0.1); padding: 2px 4px; border-radius: 3px; }
      .obsidian-link:hover { text-decoration: underline; background: rgba(0, 114, 255, 0.2); }
      .wiki-btn { background: linear-gradient(to bottom, #76d275, #2e7d32); border: 1px solid #1b5e20; border-radius: 3px; padding: 6px 15px; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); width: 100%; margin-bottom: 10px; }
      
      .wiki-text-content h2, .rich-text-content h2 { color: #004488; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; font-size: 20px; }
      .wiki-text-content h3, .rich-text-content h3 { color: #0059b3; margin-top: 20px; margin-bottom: 10px; font-size: 16px; }
      .wiki-text-content img, .rich-text-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      
      .sidebar-category-header { padding: 12px 8px 4px 10px; font-weight: 800; color: #0059b3; font-size: 13px; border-bottom: 2px solid #ccc; margin-top: 5px; display: flex; align-items: center; gap: 6px; user-select: none; }
      .sidebar-item { padding: 6px 8px 6px 20px; cursor: pointer; border-bottom: 1px solid transparent; color: #444; font-size: 13px; transition: all 0.2s; user-select: none; border-radius: 4px; margin: 1px 4px; }
      .sidebar-item:hover { background: #e6f2ff; color: #004488; }
      .sidebar-item.active-item { background: linear-gradient(90deg, #0072ff, #0099ff); color: white; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border-bottom: none; }
      
      /* NEW: Suggestion CSS */
      .suggestion-highlight { background: rgba(255, 235, 59, 0.4); border-bottom: 2px dashed #fbc02d; cursor: pointer; transition: background 0.2s; }
      .suggestion-highlight:hover { background: rgba(255, 235, 59, 0.6); }
      .suggest-float-btn { 
        position: absolute; 
        background: #0072ff; 
        color: white; 
        padding: 6px 12px; 
        border-radius: 20px; 
        font-size: 11px; 
        font-weight: bold; 
        cursor: pointer; 
        display: none; 
        z-index: 10002; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); 
        border: 1px solid rgba(255,255,255,0.3);
        pointer-events: auto;
        white-space: nowrap;
      }

      /* REFERENCE CARD STYLES */
      .ref-section-container { margin-bottom: 10px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; background: #fff; transition: all 0.3s; }
      .ref-section-header { background: linear-gradient(to bottom, #f9f9f9, #ececec); padding: 10px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #004488; border-bottom: 1px solid #ddd; }
      .ref-count { font-size: 10px; background: #0072ff; color: white; padding: 2px 8px; border-radius: 10px; opacity: 0.8; }
      .ref-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; padding: 20px; }
      .reference-card { background: rgba(255,255,255,0.9); border: 1px solid #ccc; border-radius: 4px; padding: 12px; border-left: 4px solid #0072ff; }

      .wiki-toolbar { display: flex; gap: 5px; padding: 8px; background: #f0f4f8; border: 1px solid #ccc; border-bottom: none; border-radius: 4px 4px 0 0; flex-wrap: wrap; align-items: center; }
      .wiki-tool-btn { background: white; border: 1px solid #ccc; border-radius: 3px; padding: 4px 10px; cursor: pointer; font-size: 14px; }
      .wiki-editor-textarea { flex-grow: 1; border: 1px solid #ccc; border-radius: 0 0 4px 4px; padding: 15px; font-family: 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; overflow-y: auto; background: white; outline: none; }
      
      .wiki-tool-modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 20px; border-radius: 8px; border: 1px solid #999; box-shadow: 0 15px 40px rgba(0,0,0,0.5); z-index: 10005; display: none; flex-direction: column; width: 350px; }
      .wiki-modal-close { position: absolute; top: 10px; right: 10px; cursor: pointer; font-weight: bold; color: #888; }
      .vista-resize-handle { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; z-index: 100; background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%); border-bottom-right-radius: 8px; }
    </style>
    <div class="wiki-window">
      <div class="wiki-title-bar" id="wiki-drag-handle">
        <span style="color: white; font-weight: 600; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); pointer-events: none;">Herd Knowledge Base</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <div id="wiki-minimize" style="width: 24px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05)); cursor: pointer; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 5px; box-sizing: border-box; transition: background 0.2s;">
            <div style="width: 10px; height: 2px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.5); pointer-events: none;"></div>
          </div>
          <div id="wiki-close" style="width: 38px; height: 22px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; background: linear-gradient(180deg, rgba(230,80,80,0.85) 0%, rgba(190,30,30,0.9) 49%, rgba(150,10,10,0.95) 50%, rgba(210,40,40,0.9) 100%); cursor: pointer; display: flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.3);">
            <svg width="10" height="10" viewBox="0 0 10 10" style="pointer-events: none;"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8));"></path></svg>
          </div>
        </div>
      </div>
      <div class="wiki-nav">
        <div class="wiki-tab active" data-section="lore">Horse Knowledge</div>
        <div class="wiki-tab" data-section="references">References</div>
        <div class="wiki-tab" data-section="community">Community</div>
      </div>
      <div class="wiki-content">
        <div class="wiki-sidebar" id="wiki-article-list"></div>
        <div class="wiki-article-view" id="wiki-article-body"></div>
        
        <div id="wiki-suggest-btn" class="suggest-float-btn">✨ Suggest Edit</div>

        <div id="wiki-suggestion-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 style="margin:0 0 10px 0; color:#004488;">Suggest Edit</h3>
          <p style="font-size:11px; color:#666; margin-bottom:5px;">Proposed change for: <br><span id="wiki-orig-preview" style="font-style:italic; background:#eee;"></span></p>
          <textarea id="wiki-suggest-text" class="wiki-editor-input" style="height:100px;" placeholder="Your proposed text..."></textarea>
          <button class="wiki-btn" id="wiki-submit-suggest-btn">Submit Proposal</button>
        </div>

        <div id="wiki-link-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 style="margin:0 0 10px 0; color:#004488;">Link to Article</h3>
          <input type="text" id="wiki-link-search" class="wiki-editor-input" placeholder="Search articles..." />
          <div id="wiki-link-results" style="max-height:150px; overflow-y:auto; border:1px solid #ccc; border-radius:4px; display:flex; flex-direction:column;"></div>
        </div>
        
        <div id="wiki-image-modal" class="wiki-tool-modal" style="width: 400px;">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 style="margin:0 0 10px 0; color:#004488;">Insert Image</h3>
          <input type="file" id="wiki-image-file" accept="image/*" class="wiki-editor-input" />
          <canvas id="wiki-image-canvas" style="width:100%; max-height:200px; display:none;"></canvas>
          <div style="display:flex; gap:5px; margin:10px 0;">
            <button class="wiki-tool-btn" id="wiki-crop-orig" style="flex:1;">Orig</button>
            <button class="wiki-tool-btn" id="wiki-crop-sq" style="flex:1;">1:1</button>
            <button class="wiki-tool-btn" id="wiki-crop-wide" style="flex:1;">16:9</button>
          </div>
          <button class="wiki-btn" id="wiki-insert-image-btn">Compress & Insert</button>
        </div>

        <div id="wiki-embed-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 style="margin:0 0 10px 0; color:#004488;">Embed Media</h3>
          <input type="text" id="wiki-embed-url" class="wiki-editor-input" placeholder="https://..." />
          <button class="wiki-btn" id="wiki-insert-embed-btn">Embed</button>
        </div>

        <div class="vista-resize-handle" id="wiki-resize-handle" title="Drag to Resize"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const wikiWindow = overlay.querySelector(".wiki-window");
  const suggestBtn = overlay.querySelector("#wiki-suggest-btn");
  const suggestModal = overlay.querySelector("#wiki-suggestion-modal");
  const suggestText = overlay.querySelector("#wiki-suggest-text");
  const origPreview = overlay.querySelector("#wiki-orig-preview");

  const bringToFront = () => {
    window.__highestVistaZIndex = (window.__highestVistaZIndex || 10000) + 1;
    wikiWindow.style.zIndex = window.__highestVistaZIndex;
  };
  wikiWindow.addEventListener("mousedown", bringToFront);

  const makeDraggable = (el, handle, saveKey) => {
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
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      if (wasDragged && saveKey) {
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
      if (e.target.id === "wiki-minimize" || e.target.id === "wiki-close")
        return;
      document.body.style.userSelect = "none";
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = el.offsetLeft;
      initialTop = el.offsetTop;
      wasDragged = false;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
    });
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
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isResizing = true;
      document.body.style.userSelect = "none";
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(
        document.defaultView.getComputedStyle(el).width,
        10,
      );
      startHeight = parseInt(
        document.defaultView.getComputedStyle(el).height,
        10,
      );
      document.addEventListener("mousemove", doResize);
      document.addEventListener("mouseup", stopResize);
    });
  };

  makeDraggable(
    wikiWindow,
    overlay.querySelector("#wiki-drag-handle"),
    "wiki_window_pos",
  );
  makeResizable(
    wikiWindow,
    overlay.querySelector("#wiki-resize-handle"),
    "wiki_window_size",
  );

  const sidebar = overlay.querySelector("#wiki-article-list");
  const articleBody = overlay.querySelector("#wiki-article-body");

  const categoryMap = {
    "The Manifesto of the Herd": "00_Manifesto",
    "The Relational Map of the Herd": "00_Manifesto",
    "Glossary of Entities": "00_Manifesto",
    "big horse": "01_The_Essence",
    "collective neigh": "01_The_Essence",
    "ethical hedonism": "01_The_Essence",
    galloping: "01_The_Essence",
    herd: "01_The_Essence",
    horse: "01_The_Essence",
    "inner horse": "01_The_Essence",
    "solid ground": "01_The_Essence",
    "horse-whole": "01_The_Essence",
    glue: "02_The_Solvents",
    "reclaimed factory": "02_The_Solvents",
    "the solvent": "02_The_Solvents",
    "herd vs the herd": "02_The_Solvents",
    blinders: "03_The_Apparatus",
    dolphins: "03_The_Apparatus",
    "not horse": "03_The_Apparatus",
    "the breed": "03_The_Apparatus",
    "the elite horse": "03_The_Apparatus",
    "the fence": "03_The_Apparatus",
    "the flood": "03_The_Apparatus",
    "the herd": "03_The_Apparatus",
    "the horse": "03_The_Apparatus",
    "the pedigree": "03_The_Apparatus",
    "the ribbon": "03_The_Apparatus",
    "the work horse": "03_The_Apparatus",
  };

  const getCategoryIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("manifesto")) return "📜";
    if (lower.includes("apparatus")) return "🐬";
    if (lower.includes("essence")) return "🐎";
    if (lower.includes("solvent")) return "💉";
    if (lower.includes("literature") || lower.includes("reference"))
      return "📚";
    if (lower.includes("community")) return "👥";
    return "📁";
  };

  const parseMarkdownAndLinks = (text) => {
    if (!text) return "";
    if (text.trim().startsWith('<div class="rich-text-content">')) return text;
    let parsed = text.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
      const parts = inner.split("|");
      return `<span class="obsidian-link" data-target="${parts[0].trim()}">${(parts[1] || parts[0]).trim()}</span>`;
    });
    parsed = parsed
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    let inList = false;
    parsed = parsed
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("- ")) {
          const item = `<li>${line.substring(2)}</li>`;
          if (!inList) {
            inList = true;
            return `<ul>${item}`;
          }
          return item;
        } else if (inList) {
          inList = false;
          line = `</ul>${line}`;
        }
        return line.trim() === "" ? "<br>" : `${line}<br>`;
      })
      .join("");
    if (inList) parsed += "</ul>";
    return `<div class="rich-text-content">${parsed}</div>`;
  };

  // NEW: Suggestion Popup Logic
  const showSuggestionManagementPopup = (e, sug, article) => {
    const isAdmin = userRole === "admin";
    const isAuthor = article.author === currentUsername;

    const pop = document.createElement("div");
    pop.className = "wiki-suggestion-action-pop";
    pop.style.cssText = `position: absolute; top: ${e.clientY}px; left: ${e.clientX}px; background: white; border: 1px solid #999; border-radius: 8px; padding: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 11000; width: 250px; font-size: 13px; font-family: sans-serif;`;
    pop.innerHTML = `
      <div style="color:#0072ff; font-weight:bold; margin-bottom:5px;">✨ Edit Suggestion</div>
      <div style="font-size:11px; color:#666; margin-bottom:10px;">By: ${sug.suggestedBy}</div>
      <div style="background:#f9f9f9; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px; max-height:100px; overflow-y:auto;">${sug.suggestedText}</div>
      <div id="pop-controls" style="display:flex; gap:5px; justify-content:flex-end;">
        <button class="wiki-action-btn" id="pop-ignore">Ignore</button>
      </div>
    `;

    if (isAdmin || isAuthor) {
      pop.querySelector("#pop-controls").insertAdjacentHTML(
        "afterbegin",
        `
        <button class="wiki-action-btn" style="color:green; border-color:green;" id="pop-agree">Agree</button>
        <button class="wiki-action-btn" style="color:red; border-color:red;" id="pop-delete">Delete</button>
      `,
      );
    }

    document.body.appendChild(pop);
    pop.querySelector("#pop-ignore").onclick = () => pop.remove();

    if (isAdmin || isAuthor) {
      pop.querySelector("#pop-agree").onclick = async () => {
        const newContent = article.content.replace(
          sug.originalText,
          sug.suggestedText,
        );
        await updateDoc(doc(db, "wiki_articles", article.id), {
          content: newContent,
        });
        await deleteDoc(doc(db, "wiki_suggestions", sug.id));
        pop.remove();
        renderArticle({ ...article, content: newContent });
      };
      pop.querySelector("#pop-delete").onclick = async () => {
        await deleteDoc(doc(db, "wiki_suggestions", sug.id));
        pop.remove();
        renderArticle(article);
      };
    }
  };

  const renderSidebar = () => {
    sidebar.innerHTML = "";
    if (userRole === "admin" || currentSection === "community") {
      sidebar.innerHTML += `<button class="wiki-btn" id="wiki-new-article">+ Create Entry</button>`;
    }

    const sectionArticles = articles.filter(
      (a) => a.section === currentSection,
    );
    const groupedArticles = {};
    sectionArticles.forEach((article) => {
      let rawCat = article.category;
      if (!rawCat) {
        if (currentSection === "lore")
          rawCat = categoryMap[article.title] || "04_Uncategorized";
        else if (currentSection === "references") rawCat = "Literature";
        else rawCat = "Community Submissions";
      }
      if (rawCat === "01_The_Apparatus") rawCat = "03_The_Apparatus";
      if (rawCat === "02_The_Essence") rawCat = "01_The_Essence";
      if (rawCat === "03_The_Solvents") rawCat = "02_The_Solvents";
      if (!groupedArticles[rawCat]) groupedArticles[rawCat] = [];
      groupedArticles[rawCat].push(article);
    });

    Object.keys(groupedArticles)
      .sort()
      .forEach((rawCat) => {
        const catHeader = document.createElement("div");
        catHeader.className = "sidebar-category-header";
        const displayName = rawCat
          .replace(/^\d{2}_/, "")
          .replace(/_/g, " ")
          .trim();
        catHeader.innerHTML = `<span>${getCategoryIcon(displayName)}</span> <span>${displayName}</span>`;
        sidebar.appendChild(catHeader);
        groupedArticles[rawCat].forEach((article) => {
          const item = document.createElement("div");
          item.className =
            "sidebar-item" +
            (article.id === currentArticleId ? " active-item" : "");
          item.innerText = article.title;
          item.onclick = () => {
            currentArticleId = article.id;
            renderArticle(article);
            renderSidebar();
          };
          sidebar.appendChild(item);
        });
      });

    const newBtn = sidebar.querySelector("#wiki-new-article");
    if (newBtn)
      newBtn.onclick = () =>
        renderEditor({
          title: "",
          tags: [],
          category: "",
          content: "",
          section: currentSection,
          author: currentUsername,
        });
  };

  const renderArticle = (article) => {
    currentArticleId = article.id;
    const isReference = article.section === "references";
    let articleContent = article.content;

    // INJECT SUGGESTION HIGHLIGHTS
    activeSuggestions
      .filter((s) => s.articleId === article.id && s.status === "pending")
      .forEach((s) => {
        const highlight = `<span class="suggestion-highlight" data-sid="${s.id}">${s.originalText}</span>`;
        articleContent = articleContent.replace(s.originalText, highlight);
      });

    let html = "";
    if (isReference) {
      const segments = articleContent.split(/(?=^### )/gm);
      html = segments
        .map((seg) => {
          if (!seg.trim()) return "";
          const theme = (seg.match(/^### (.*$)/m) || [])[1] || "General";
          const bullets = seg.split(/\n- /g).slice(1);
          const cards = bullets
            .map((b) => {
              const p = b.match(/^\*\*(.*?)\*\*:(.*)/s);
              return `<div class="reference-card"><div class="ref-card-header">${parseMarkdownAndLinks(p ? p[1] : "Source")}</div><div class="ref-card-body">${parseMarkdownAndLinks(p ? p[2] : b)}</div></div>`;
            })
            .join("");
          return `<div class="ref-section-container"><div class="ref-section-header" onclick="this.parentElement.classList.toggle('collapsed')"><span>📂 ${theme}</span><span class="ref-count">${bullets.length} Sources</span></div><div class="ref-grid">${cards}</div></div>`;
        })
        .join("");
    } else {
      html = parseMarkdownAndLinks(articleContent);
    }

    const isAdmin = userRole === "admin";
    const isAuthor = article.author === currentUsername;
    const canEdit = isAdmin || (article.section === "community" && isAuthor);

    articleBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:5px;">
        <h1 style="color:#002244; margin:0; font-size:28px;">${article.title}</h1>
        <div style="display:flex;">
          ${canEdit ? `<button class="wiki-action-btn" id="wiki-edit-btn">Edit</button>` : ""}
          ${isAdmin || (isAuthor && article.section === "community") ? `<button class="wiki-action-btn" id="wiki-delete-btn" style="color:red;">Delete</button>` : ""}
        </div>
      </div>
      <div style="font-size:12px; color:#666; margin-bottom:20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">By: <strong>${article.author}</strong> | Section: ${article.section}</div>
      <div class="wiki-text-content">${html}</div>
    `;

    // Highlight Suggest Listener

    articleBody.onmouseup = (e) => {
      const sel = window.getSelection();
      if (
        sel.rangeCount > 0 &&
        !sel.isCollapsed &&
        sel.toString().trim().length > 0
      ) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const contentRect = overlay
          .querySelector(".wiki-content")
          .getBoundingClientRect();

        currentSelectionData = {
          text: sel.toString().trim(),
          articleId: currentArticleId,
        };

        // Use contentRect as the anchor for absolute positioning
        suggestBtn.style.left = `${rect.left - contentRect.left + rect.width / 2 - 45}px`;
        suggestBtn.style.top = `${rect.top - contentRect.top - 40}px`;
        suggestBtn.style.display = "block";
      } else {
        suggestBtn.style.display = "none";
      }
    };

    articleBody.querySelectorAll(".suggestion-highlight").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        showSuggestionManagementPopup(
          e,
          activeSuggestions.find((s) => s.id === el.dataset.sid),
          article,
        );
      };
    });

    articleBody.querySelectorAll(".obsidian-link").forEach((l) => {
      l.onclick = () => {
        const found = articles.find(
          (a) => a.title.toLowerCase() === l.dataset.target.toLowerCase(),
        );
        if (found) {
          currentSection = found.section;
          currentArticleId = found.id;
          renderSidebar();
          renderArticle(found);
        } else alert(`"${l.dataset.target}" not written yet.`);
      };
    });

    if (canEdit)
      articleBody.querySelector("#wiki-edit-btn").onclick = () =>
        renderEditor(article);
    if (articleBody.querySelector("#wiki-delete-btn"))
      articleBody.querySelector("#wiki-delete-btn").onclick = async () => {
        if (confirm(`Delete "${article.title}"?`)) {
          await deleteDoc(doc(db, "wiki_articles", article.id));
          currentArticleId = null;
          renderSidebar();
        }
      };
  };

  const renderEditor = (article) => {
    const isNew = !article.id;
    let initC = article.content || "";
    if (initC && !initC.startsWith('<div class="rich-text-content">'))
      initC = parseMarkdownAndLinks(initC);
    initC = initC
      .replace(/^<div class="rich-text-content">/, "")
      .replace(/<\/div>$/, "");

    articleBody.innerHTML = `
      <h2 style="margin-bottom:15px; color:#004488;">${isNew ? "New Entry" : "Editing: " + article.title}</h2>
      <div style="display:flex; gap:10px; margin-bottom:10px;">
        <input type="text" id="edit-title" style="flex:2; padding:8px;" value="${article.title || ""}" placeholder="Title" />
        <input type="text" id="edit-category" style="flex:1; padding:8px;" value="${(article.category || "").replace(/^\d{2}_/, "").replace(/_/g, " ")}" placeholder="Category" />
      </div>
      <div class="wiki-toolbar">
        <button class="wiki-tool-btn" data-cmd="bold"><b>B</b></button>
        <button class="wiki-tool-btn" data-cmd="italic"><i>I</i></button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H2">H2</button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H3">H3</button>
        <button class="wiki-tool-btn" id="tool-link">🔗 Link</button>
        <button class="wiki-tool-btn" id="tool-image">🖼️ Image</button>
        <button class="wiki-tool-btn" id="tool-embed">🎬 Embed</button>
        <button class="wiki-tool-btn" id="tool-mic">🎙️ Mic</button>
      </div>
      <div id="edit-content" class="wiki-editor-textarea rich-text-content" contenteditable="true">${initC}</div>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button class="wiki-btn" id="wiki-save-btn">Save</button>
        <button class="wiki-btn" id="wiki-cancel-btn" style="background:#999;">Cancel</button>
      </div>
    `;

    const ed = articleBody.querySelector("#edit-content");
    articleBody.querySelectorAll(".wiki-tool-btn[data-cmd]").forEach((b) => {
      b.onclick = () => {
        document.execCommand(b.dataset.cmd, false, b.dataset.val || null);
        ed.focus();
      };
    });

    articleBody.querySelector("#tool-mic").onclick = async () => {
      const mBtn = articleBody.querySelector("#tool-mic");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mr = new MediaRecorder(stream);
        const ac = [];
        mr.ondataavailable = (e) => ac.push(e.data);
        mr.onstop = () => {
          const b = new Blob(ac, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () =>
            document.execCommand(
              "insertHTML",
              false,
              `<audio controls src="${reader.result}"></audio><br>`,
            );
          reader.readAsDataURL(b);
        };
        mr.start();
        mBtn.innerText = "🔴 Rec...";
        setTimeout(() => {
          mr.stop();
          mBtn.innerText = "🎙️ Mic";
        }, 5000);
      } catch (e) {
        alert("Mic denied.");
      }
    };

    const iMod = overlay.querySelector("#wiki-image-modal");
    const iCan = overlay.querySelector("#wiki-image-canvas");
    articleBody.querySelector("#tool-image").onclick = () => {
      iMod.style.display = "flex";
      overlay.querySelector("#wiki-image-file").value = "";
      iCan.style.display = "none";
    };
    overlay.querySelector("#wiki-image-file").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          iCan.style.display = "block";
          iCan.width = 800;
          iCan.height = (img.height * 800) / img.width;
          iCan.getContext("2d").drawImage(img, 0, 0, 800, iCan.height);
        };
        img.src = ev.target.result;
      };
      r.readAsDataURL(f);
    };
    overlay.querySelector("#wiki-insert-image-btn").onclick = () => {
      document.execCommand(
        "insertImage",
        false,
        iCan.toDataURL("image/webp", 0.7),
      );
      iMod.style.display = "none";
    };

    articleBody.querySelector("#wiki-save-btn").onclick = async () => {
      const title = articleBody.querySelector("#edit-title").value.trim();
      const cat = articleBody.querySelector("#edit-category").value.trim();
      const content = `<div class="rich-text-content">${ed.innerHTML}</div>`;
      if (!title) return alert("Title required.");
      if (isNew)
        await addDoc(collection(db, "wiki_articles"), {
          title,
          category: cat,
          content,
          section: currentSection,
          author: currentUsername,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      else
        await updateDoc(doc(db, "wiki_articles", article.id), {
          title,
          category: cat,
          content,
          updatedAt: serverTimestamp(),
        });
      renderSidebar();
    };
    articleBody.querySelector("#wiki-cancel-btn").onclick = () =>
      isNew ? renderSidebar() : renderArticle(article);
  };

  suggestBtn.onclick = () => {
    suggestModal.style.display = "flex";
    origPreview.innerText = currentSelectionData.text;
    suggestText.value = currentSelectionData.text;
    suggestBtn.style.display = "none";
  };
  overlay.querySelector("#wiki-submit-suggest-btn").onclick = async () => {
    if (!suggestText.value.trim()) return;
    await addDoc(collection(db, "wiki_suggestions"), {
      articleId: currentArticleId,
      suggestedBy: currentUsername,
      originalText: currentSelectionData.text,
      suggestedText: suggestText.value.trim(),
      status: "pending",
      timestamp: serverTimestamp(),
    });
    suggestModal.style.display = "none";
    alert("Suggestion submitted.");
  };

  onSnapshot(collection(db, "wiki_suggestions"), (snap) => {
    activeSuggestions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (currentArticleId) {
      const cur = articles.find((a) => a.id === currentArticleId);
      if (cur) renderArticle(cur);
    }
  });

  onSnapshot(query(collection(db, "wiki_articles")), (snap) => {
    articles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderSidebar();
    if (!currentArticleId && articles.length > 0) {
      const first = articles.find((a) => a.section === currentSection);
      if (first) renderArticle(first);
    }
  });

  overlay.querySelectorAll(".wiki-tab").forEach((tab) => {
    tab.onclick = () => {
      overlay
        .querySelectorAll(".wiki-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentSection = tab.dataset.section;
      renderSidebar();
      const first = articles.find((a) => a.section === currentSection);
      if (first) renderArticle(first);
      else
        articleBody.innerHTML = `<h2 style="color: #ccc; text-align: center; margin-top: 20%;">No entries.</h2>`;
    };
  });

  overlay.querySelector("#wiki-minimize").onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false;
    overlay.style.display = "none";
    syncWikiTaskbar();
  };
  overlay.querySelector("#wiki-close").onclick = (e) => {
    e.stopPropagation();
    overlay.remove();
    wikiWindowRef = null;
    isAppRunning = false;
    isWindowVisible = false;
    syncWikiTaskbar();
  };
}

// EXPORTED INITIALIZER
export function initWiki(db, currentUsername, userRole) {
  if (!currentUsername) return;

  const wikiIcon = document.createElement("div");
  wikiIcon.id = "wiki-desktop-icon";

  wikiIcon.style.cssText = `
    position: absolute; 
    top: 65%; 
    right: 10%; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center;
    cursor: pointer; 
    z-index: 50; 
    pointer-events: auto;
    transition: transform 0.2s ease, filter 0.2s ease;
  `;

  wikiIcon.innerHTML = `
    <div style="width: 48px; height: 48px; margin-bottom: 5px; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.6));">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="pistachio-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#e2f5c8" />
            <stop offset="50%" stop-color="#b5ce27" /> <stop offset="100%" stop-color="#8a9e1e" />
          </linearGradient>
          <linearGradient id="pistachio-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#b5ce27" />
            <stop offset="100%" stop-color="#6b7a17" />
          </linearGradient>
        </defs>
        <path d="M10,25 L35,25 L45,35 L90,35 L90,85 L10,85 Z" fill="url(#pistachio-dark)" />
        <path d="M15,30 L85,30 L85,45 L15,45 Z" fill="#ffffff" opacity="0.8"/>
        <path d="M10,40 L90,40 L90,85 L10,85 Z" fill="url(#pistachio-grad)" opacity="0.95"/>
      </svg>
    </div>
    <div style="color: #ededee; font-family: serif; font-size: 15px; text-shadow: 1px 1px 2px black;">Wiki</div>
  `;

  wikiIcon.onmouseenter = () => {
    wikiIcon.style.transform = "scale(1.1)";
    wikiIcon.style.filter = "brightness(1.1)";
  };
  wikiIcon.onmouseleave = () => {
    wikiIcon.style.transform = "scale(1)";
    wikiIcon.style.filter = "none";
  };

  wikiIcon.onclick = async (e) => {
    e.stopPropagation();

    // FIX: Fetch the live role from the database to bypass the load-time race condition
    let activeRole = userRole;
    try {
      const userSnap = await getDoc(doc(db, "users", currentUsername));
      if (userSnap.exists() && userSnap.data().role) {
        activeRole = userSnap.data().role;
      }
    } catch (err) {
      console.warn("Could not verify role:", err);
    }

    openWikiOverlay(db, currentUsername, activeRole);
  };

  document.body.appendChild(wikiIcon);
}
