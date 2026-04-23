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
      "Knowledge Base",
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
  let currentArticleId = null;

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
    position: fixed; inset: 0; pointer-events: none;
    z-index: 10000; display: block; font-family: 'Segoe UI', Tahoma, sans-serif;
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
      .wiki-article-view { flex-grow: 1; padding: 30px 40px; overflow-y: auto; color: #222; font-size: 15px; line-height: 1.6; display: flex; flex-direction: column; }
      
      .obsidian-link { color: #0072ff; text-decoration: none; font-weight: 600; cursor: pointer; background: rgba(0, 114, 255, 0.1); padding: 2px 4px; border-radius: 3px; }
      .obsidian-link:hover { text-decoration: underline; background: rgba(0, 114, 255, 0.2); }
      .wiki-btn { background: linear-gradient(to bottom, #76d275, #2e7d32); border: 1px solid #1b5e20; border-radius: 3px; padding: 6px 15px; color: white; font-weight: bold; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); width: 100%; margin-bottom: 10px; }
      
      .wiki-text-content h2, .rich-text-content h2 { color: #004488; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; font-size: 20px; }
      .wiki-text-content h3, .rich-text-content h3 { color: #0059b3; margin-top: 20px; margin-bottom: 10px; font-size: 16px; }
      .wiki-text-content strong, .rich-text-content strong { font-weight: 700; color: #111; }
      .wiki-text-content ul, .rich-text-content ul { margin-top: 5px; margin-bottom: 15px; padding-left: 20px; }
      .wiki-text-content li, .rich-text-content li { margin-bottom: 5px; }
      .wiki-text-content img, .rich-text-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      .wiki-text-content iframe, .rich-text-content iframe { max-width: 100%; border-radius: 6px; margin: 10px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      .wiki-text-content audio, .rich-text-content audio { width: 100%; max-width: 400px; margin: 10px 0; }
      
      .sidebar-category-header { padding: 12px 8px 4px 10px; font-weight: 800; color: #0059b3; font-size: 13px; border-bottom: 2px solid #ccc; margin-top: 5px; display: flex; align-items: center; gap: 6px; user-select: none; }
      .sidebar-item { padding: 6px 8px 6px 20px; cursor: pointer; border-bottom: 1px solid transparent; color: #444; font-size: 13px; transition: all 0.2s; user-select: none; border-radius: 4px; margin: 1px 4px; }
      .sidebar-item:hover { background: #e6f2ff; color: #004488; }
      .sidebar-item.active-item { background: linear-gradient(90deg, #0072ff, #0099ff); color: white; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); border-bottom: none; }
      
      .wiki-action-btn { background: transparent; border: 1px solid #ccc; border-radius: 3px; padding: 3px 8px; cursor: pointer; font-size: 12px; color: #555; transition: all 0.2s; margin-left: 8px; }
      .wiki-action-btn:hover { background: #f0f0f0; color: #000; }
      .wiki-action-btn.delete:hover { background: #ffe6e6; color: #cc0000; border-color: #cc0000; }
      
      /* NEW EDITOR STYLES */
      .wiki-editor-input { width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 14px; box-sizing: border-box; }
      .wiki-toolbar { display: flex; gap: 5px; padding: 8px; background: #f0f4f8; border: 1px solid #ccc; border-bottom: none; border-radius: 4px 4px 0 0; flex-wrap: wrap; align-items: center; }
      .wiki-tool-btn { background: white; border: 1px solid #ccc; border-radius: 3px; padding: 4px 10px; cursor: pointer; font-size: 14px; font-weight: bold; color: #333; transition: 0.2s; }
      .wiki-tool-btn:hover { background: #e6f2ff; border-color: #0072ff; color: #0072ff; }
      .wiki-editor-textarea { flex-grow: 1; border: 1px solid #ccc; border-radius: 0 0 4px 4px; padding: 15px; font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 15px; line-height: 1.6; overflow-y: auto; background: white; outline: none; margin-bottom: 10px; }
      .wiki-editor-textarea:focus { border-color: #0072ff; box-shadow: inset 0 0 5px rgba(0,114,255,0.1); }
      
      /* MODAL STYLES */
      .wiki-tool-modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 20px; border-radius: 8px; border: 1px solid #999; box-shadow: 0 15px 40px rgba(0,0,0,0.5); z-index: 10001; display: none; flex-direction: column; width: 350px; }
      .wiki-modal-close { position: absolute; top: 10px; right: 10px; cursor: pointer; font-weight: bold; color: #888; }
      .wiki-modal-close:hover { color: red; }
      
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
        <div class="wiki-article-view" id="wiki-article-body">
          <h2 style="color: #ccc; text-align: center; margin-top: 20%;">Select an article to begin.</h2>
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
          <canvas id="wiki-image-canvas" style="width:100%; max-height:200px; background:#eee; border:1px dashed #999; margin-bottom:10px; display:none; object-fit:contain;"></canvas>
          <div style="display:flex; gap:5px; margin-bottom:10px;">
            <button class="wiki-tool-btn" id="wiki-crop-orig" style="flex:1;">Orig</button>
            <button class="wiki-tool-btn" id="wiki-crop-sq" style="flex:1;">1:1</button>
            <button class="wiki-tool-btn" id="wiki-crop-wide" style="flex:1;">16:9</button>
          </div>
          <button class="wiki-btn" id="wiki-insert-image-btn">Compress & Insert</button>
        </div>

        <div id="wiki-embed-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 style="margin:0 0 10px 0; color:#004488;">Embed Media</h3>
          <p style="font-size:12px; color:#666; margin:0 0 10px 0;">Paste a YouTube URL, or a direct link to an MP3/MP4.</p>
          <input type="text" id="wiki-embed-url" class="wiki-editor-input" placeholder="https://..." />
          <button class="wiki-btn" id="wiki-insert-embed-btn">Embed</button>
        </div>

        <div class="vista-resize-handle" id="wiki-resize-handle" title="Drag to Resize"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const wikiWindow = overlay.querySelector(".wiki-window");

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

  const dragHandle = overlay.querySelector("#wiki-drag-handle");
  const resizeHandle = overlay.querySelector("#wiki-resize-handle");
  makeDraggable(wikiWindow, dragHandle, "wiki_window_pos");
  makeResizable(wikiWindow, resizeHandle, "wiki_window_size");

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

  // Convert old Markdown to HTML for the WYSIWYG or Viewer
  const parseMarkdownAndLinks = (text) => {
    if (!text) return "";
    // If it's already generated by the WYSIWYG, just return it
    if (text.trim().startsWith('<div class="rich-text-content">')) return text;

    let parsed = text.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
      const parts = inner.split("|");
      const target = parts[0];
      const display = parts.length > 1 ? parts[1] : parts[0];
      return `<span class="obsidian-link" data-target="${target.trim()}">${display.trim()}</span>`;
    });
    parsed = parsed.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    parsed = parsed.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
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
        if (
          line.trim().startsWith("<h") ||
          line.trim().startsWith("<ul>") ||
          line.trim().startsWith("</ul>")
        )
          return line;
        return line.trim() === "" ? "<br>" : `${line}<br>`;
      })
      .join("");
    if (inList) parsed += "</ul>";

    // Wrap old conversions so they format nicely
    return `<div class="rich-text-content">${parsed}</div>`;
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

    const sortedCategories = Object.keys(groupedArticles).sort();

    sortedCategories.forEach((rawCat) => {
      const catHeader = document.createElement("div");
      catHeader.className = "sidebar-category-header";
      const displayName = rawCat
        .replace(/^\d{2}_/, "")
        .replace(/_/g, " ")
        .trim();
      const icon = getCategoryIcon(displayName);

      catHeader.innerHTML = `<span>${icon}</span> <span>${displayName}</span>`;
      sidebar.appendChild(catHeader);

      groupedArticles[rawCat].forEach((article) => {
        const item = document.createElement("div");
        item.className = "sidebar-item";
        if (article.id === currentArticleId) item.classList.add("active-item");

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
    if (newBtn) {
      newBtn.onclick = () => {
        currentArticleId = null;
        renderSidebar();
        renderEditor({
          title: "",
          tags: [],
          category: "",
          content: "",
          section: currentSection,
          author: currentUsername,
        });
      };
    }
  };

  const renderEditor = (article) => {
    const isNew = !article.id;

    const uniqueCleanCategories = [
      ...new Set(
        articles.map((a) => {
          let raw = a.category || categoryMap[a.title] || "Uncategorized";
          if (raw === "01_The_Apparatus") raw = "03_The_Apparatus";
          if (raw === "02_The_Essence") raw = "01_The_Essence";
          if (raw === "03_The_Solvents") raw = "02_The_Solvents";
          return raw
            .replace(/^\d{2}_/, "")
            .replace(/_/g, " ")
            .trim();
        }),
      ),
    ].sort();

    const dataListHTML = `<datalist id="category-options">${uniqueCleanCategories.map((c) => `<option value="${c}">`).join("")}</datalist>`;
    let displayCategory = article.category
      ? article.category
          .replace(/^\d{2}_/, "")
          .replace(/_/g, " ")
          .trim()
      : "";

    // Convert old text to HTML if needed so it displays perfectly in the WYSIWYG
    let initContent = article.content || "";
    if (
      initContent &&
      !initContent.startsWith('<div class="rich-text-content">')
    ) {
      initContent = parseMarkdownAndLinks(initContent);
    }
    // Strip the outer wrapper just for the editor window
    initContent = initContent
      .replace(/^<div class="rich-text-content">/, "")
      .replace(/<\/div>$/, "");

    articleBody.innerHTML = `
      <h2 style="color: #004488; margin-bottom: 15px;">${isNew ? "Create New Entry" : "Editing: " + article.title}</h2>
      
      <div style="display:flex; gap:10px;">
        <input type="text" id="edit-title" class="wiki-editor-input" style="flex:2;" value="${article.title ? article.title.replace(/"/g, "&quot;") : ""}" placeholder="Article Title" />
        <input type="text" id="edit-category" list="category-options" class="wiki-editor-input" style="flex:1;" value="${displayCategory}" placeholder="Category" />
      </div>
      
      <input type="text" id="edit-tags" class="wiki-editor-input" value="${article.tags ? article.tags.join(", ") : ""}" placeholder="Tags (comma separated)" />
      
      <div class="wiki-toolbar">
        <button class="wiki-tool-btn" data-cmd="bold" title="Bold">🅱️</button>
        <button class="wiki-tool-btn" data-cmd="italic" title="Italic">ℹ️</button>
        <div style="width:1px; height:20px; background:#ccc; margin:0 5px;"></div>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H2" title="Header 2">H2</button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H3" title="Header 3">H3</button>
        <button class="wiki-tool-btn" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
        <div style="width:1px; height:20px; background:#ccc; margin:0 5px;"></div>
        <button class="wiki-tool-btn" id="tool-link" title="Link to Article">🔗 Link</button>
        <button class="wiki-tool-btn" id="tool-image" title="Insert Image">🖼️ Image</button>
        <button class="wiki-tool-btn" id="tool-embed" title="Embed Video/Audio">🎬 Embed</button>
        <button class="wiki-tool-btn" id="tool-mic" title="Record Audio">🎙️ Mic</button>
      </div>
      
      <div id="edit-content" class="wiki-editor-textarea rich-text-content" contenteditable="true">${initContent}</div>
      
      ${dataListHTML}
      
      <div style="display: flex; gap: 10px; flex-shrink: 0;">
        <button class="wiki-btn" id="wiki-save-btn" style="width: auto;">Save Entry</button>
        <button class="wiki-btn" id="wiki-cancel-btn" style="width: auto; background: linear-gradient(to bottom, #999, #666); border-color: #555;">Cancel</button>
      </div>
    `;

    const editorDiv = articleBody.querySelector("#edit-content");

    // --- TOOLBAR LOGIC ---
    let savedRange = null;
    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) savedRange = sel.getRangeAt(0);
    };
    const restoreSelection = () => {
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    };

    articleBody.querySelectorAll(".wiki-tool-btn[data-cmd]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute("data-cmd");
        const val = btn.getAttribute("data-val") || null;
        document.execCommand(cmd, false, val);
        editorDiv.focus();
      };
    });

    // 1. LINK LOGIC
    const linkModal = overlay.querySelector("#wiki-link-modal");
    const linkSearch = overlay.querySelector("#wiki-link-search");
    const linkResults = overlay.querySelector("#wiki-link-results");

    articleBody.querySelector("#tool-link").onclick = () => {
      saveSelection();
      if (!savedRange || savedRange.collapsed)
        return alert("Please highlight text first to create a link.");
      linkModal.style.display = "flex";
      linkSearch.value = "";
      linkResults.innerHTML = "";
      linkSearch.focus();
    };

    linkSearch.oninput = () => {
      const val = linkSearch.value.toLowerCase();
      linkResults.innerHTML = "";
      if (!val) return;
      const matches = articles.filter((a) =>
        a.title.toLowerCase().includes(val),
      );
      matches.forEach((m) => {
        const div = document.createElement("div");
        div.style.cssText =
          "padding: 8px; cursor:pointer; border-bottom:1px solid #eee; font-size:13px;";
        div.innerText = m.title;
        div.onclick = () => {
          restoreSelection();
          const span = document.createElement("span");
          span.className = "obsidian-link";
          span.dataset.target = m.title;
          span.innerText = savedRange.toString();
          savedRange.deleteContents();
          savedRange.insertNode(span);

          // Move cursor after link
          savedRange.setStartAfter(span);
          savedRange.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedRange);

          linkModal.style.display = "none";
        };
        linkResults.appendChild(div);
      });
    };

    // 2. IMAGE LOGIC (Crop & Compress to WebP Base64)
    const imgModal = overlay.querySelector("#wiki-image-modal");
    const imgFile = overlay.querySelector("#wiki-image-file");
    const imgCanvas = overlay.querySelector("#wiki-image-canvas");
    const ctx = imgCanvas.getContext("2d");
    let currentImage = null;
    let cropMode = "orig"; // orig, sq, wide

    articleBody.querySelector("#tool-image").onclick = () => {
      saveSelection();
      imgModal.style.display = "flex";
      imgCanvas.style.display = "none";
      imgFile.value = "";
    };

    const drawImage = () => {
      if (!currentImage) return;
      imgCanvas.style.display = "block";

      const MAX_WIDTH = 800;
      let width = currentImage.width;
      let height = currentImage.height;

      // Calculate Crop Target
      let sourceX = 0,
        sourceY = 0,
        sourceW = width,
        sourceH = height;

      if (cropMode === "sq") {
        const min = Math.min(width, height);
        sourceX = (width - min) / 2;
        sourceY = (height - min) / 2;
        sourceW = min;
        sourceH = min;
      } else if (cropMode === "wide") {
        const targetRatio = 16 / 9;
        const currentRatio = width / height;
        if (currentRatio > targetRatio) {
          // Image is wider than 16:9
          sourceW = height * targetRatio;
          sourceX = (width - sourceW) / 2;
        } else {
          // Image is taller than 16:9
          sourceH = width / targetRatio;
          sourceY = (height - sourceH) / 2;
        }
      }

      // Scale down for compression
      let targetW = sourceW,
        targetH = sourceH;
      if (targetW > MAX_WIDTH) {
        targetH = Math.round((targetH * MAX_WIDTH) / targetW);
        targetW = MAX_WIDTH;
      }

      imgCanvas.width = targetW;
      imgCanvas.height = targetH;
      ctx.drawImage(
        currentImage,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        targetW,
        targetH,
      );
    };

    imgFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        currentImage = new Image();
        currentImage.onload = drawImage;
        currentImage.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };

    overlay.querySelector("#wiki-crop-orig").onclick = () => {
      cropMode = "orig";
      drawImage();
    };
    overlay.querySelector("#wiki-crop-sq").onclick = () => {
      cropMode = "sq";
      drawImage();
    };
    overlay.querySelector("#wiki-crop-wide").onclick = () => {
      cropMode = "wide";
      drawImage();
    };

    overlay.querySelector("#wiki-insert-image-btn").onclick = () => {
      if (!currentImage) return alert("Select an image first.");
      restoreSelection();
      // Compress aggressively to lightweight WebP
      const dataUrl = imgCanvas.toDataURL("image/webp", 0.7);
      document.execCommand("insertImage", false, dataUrl);
      imgModal.style.display = "none";
    };

    // 3. EMBED LOGIC
    const embedModal = overlay.querySelector("#wiki-embed-modal");
    const embedUrl = overlay.querySelector("#wiki-embed-url");

    articleBody.querySelector("#tool-embed").onclick = () => {
      saveSelection();
      embedModal.style.display = "flex";
      embedUrl.value = "";
    };

    overlay.querySelector("#wiki-insert-embed-btn").onclick = () => {
      const url = embedUrl.value.trim();
      if (!url) return;
      restoreSelection();

      let html = "";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const vidId =
          url.split("v=")[1]?.split("&")[0] ||
          url.split("youtu.be/")[1]?.split("?")[0];
        if (vidId) {
          html = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${vidId}" frameborder="0" allowfullscreen></iframe><br>`;
        }
      } else if (url.match(/\.(mp3|wav|ogg)$/i)) {
        html = `<audio controls src="${url}"></audio><br>`;
      } else if (url.match(/\.(mp4|webm)$/i)) {
        html = `<video controls src="${url}" style="width:100%; max-width:600px;"></video><br>`;
      } else {
        // Fallback generic link
        html = `<a href="${url}" target="_blank">${url}</a>`;
      }

      document.execCommand("insertHTML", false, html);
      embedModal.style.display = "none";
    };

    // 4. LIVE MIC RECORDING LOGIC
    let mediaRecorder;
    let audioChunks = [];
    const micBtn = articleBody.querySelector("#tool-mic");

    micBtn.onclick = async () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        micBtn.style.color = "#333";
        micBtn.innerHTML = "🎙️ Mic";
      } else {
        try {
          saveSelection();
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

          mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            audioChunks = [];
            const reader = new FileReader();
            reader.onloadend = () => {
              restoreSelection();
              document.execCommand(
                "insertHTML",
                false,
                `<audio controls src="${reader.result}"></audio><br>`,
              );
            };
            reader.readAsDataURL(blob);
          };

          mediaRecorder.start();
          micBtn.style.color = "red";
          micBtn.innerHTML = "🔴 Rec...";
        } catch (e) {
          alert("Microphone access denied or unavailable.");
        }
      }
    };

    // --- SAVE LOGIC ---
    articleBody.querySelector("#wiki-cancel-btn").onclick = () => {
      if (isNew) {
        currentArticleId = null;
        articleBody.innerHTML = `<h2 style="color: #ccc; text-align: center; margin-top: 20%;">Select an article to begin.</h2>`;
        renderSidebar();
      } else {
        renderArticle(article);
      }
    };

    articleBody.querySelector("#wiki-save-btn").onclick = async () => {
      const newTitle = articleBody.querySelector("#edit-title").value.trim();
      const newCatStr = articleBody
        .querySelector("#edit-category")
        .value.trim();
      const newTagsStr = articleBody.querySelector("#edit-tags").value.trim();

      // Pull HTML directly from the WYSIWYG box
      const rawHTML = articleBody.querySelector("#edit-content").innerHTML;
      const newContent = `<div class="rich-text-content">${rawHTML}</div>`;

      const newTags = newTagsStr
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      if (!newTitle) return alert("Title is required to save an entry!");

      let finalCategory = newCatStr || "Uncategorized";
      const matchingArticle = articles.find((a) => {
        let raw = a.category || categoryMap[a.title] || "Uncategorized";
        if (raw === "01_The_Apparatus") raw = "03_The_Apparatus";
        if (raw === "02_The_Essence") raw = "01_The_Essence";
        if (raw === "03_The_Solvents") raw = "02_The_Solvents";
        return (
          raw
            .replace(/^\d{2}_/, "")
            .replace(/_/g, " ")
            .trim()
            .toLowerCase() === newCatStr.toLowerCase()
        );
      });

      if (matchingArticle) {
        finalCategory =
          matchingArticle.category ||
          categoryMap[matchingArticle.title] ||
          finalCategory;
        if (finalCategory === "01_The_Apparatus")
          finalCategory = "03_The_Apparatus";
        if (finalCategory === "02_The_Essence")
          finalCategory = "01_The_Essence";
        if (finalCategory === "03_The_Solvents")
          finalCategory = "02_The_Solvents";
      }

      try {
        if (isNew) {
          const docRef = await addDoc(collection(db, "wiki_articles"), {
            title: newTitle,
            category: finalCategory,
            tags: newTags,
            content: newContent,
            section: currentSection,
            author: currentUsername,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          currentArticleId = docRef.id;
          articleBody.innerHTML = `<h2 style="color: #ccc; text-align: center; margin-top: 20%;">Article created! Select it from the sidebar.</h2>`;
        } else {
          await updateDoc(doc(db, "wiki_articles", article.id), {
            title: newTitle,
            category: finalCategory,
            tags: newTags,
            content: newContent,
            updatedAt: serverTimestamp(),
          });
          renderArticle({
            ...article,
            title: newTitle,
            category: finalCategory,
            tags: newTags,
            content: newContent,
          });
        }
      } catch (err) {
        console.error(err);
        alert("Error saving article. Check console.");
      }
    };
  };

  const renderArticle = (article) => {
    currentArticleId = article.id;
    const formattedContent = parseMarkdownAndLinks(article.content);
    const canEdit = userRole === "admin" || article.section === "community";
    const canDelete = userRole === "admin";

    let actionButtonsHTML = "";
    if (canEdit)
      actionButtonsHTML += `<button class="wiki-action-btn" id="wiki-edit-btn">Edit</button>`;
    if (canDelete)
      actionButtonsHTML += `<button class="wiki-action-btn delete" id="wiki-delete-btn">Delete</button>`;

    articleBody.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
        <h1 style="color: #002244; margin: 0; font-size: 28px;">${article.title}</h1>
        <div style="display: flex; margin-top: 5px;">${actionButtonsHTML}</div>
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
        By: <strong>${article.author}</strong> | Section: <span style="text-transform: capitalize;">${article.section}</span>
      </div>
      <div class="wiki-text-content">${formattedContent}</div>
      <hr style="margin-top: 50px; border: 0; border-top: 1px dashed #ccc;">
      <h3 style="color: #555; margin-top: 20px;">Community Suggestions & Comments</h3>
      <div id="wiki-comments-section" style="font-style: italic; color: #888; background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #ddd;">
        (Commenting & highlight-suggestions coming online soon...)
      </div>
    `;

    if (canEdit)
      articleBody.querySelector("#wiki-edit-btn").onclick = () =>
        renderEditor(article);

    if (canDelete) {
      articleBody.querySelector("#wiki-delete-btn").onclick = async () => {
        if (
          confirm(
            `Are you sure you want to permanently delete "${article.title}"?`,
          )
        ) {
          try {
            await deleteDoc(doc(db, "wiki_articles", article.id));
            currentArticleId = null;
            articleBody.innerHTML = `<h2 style="color: #ccc; text-align: center; margin-top: 20%;">Entry deleted.</h2>`;
            renderSidebar();
          } catch (err) {
            console.error(err);
            alert("Error deleting article.");
          }
        }
      };
    }

    // Attach click listeners to the interactive links in the article view
    articleBody.querySelectorAll(".obsidian-link").forEach((link) => {
      link.onclick = (e) => {
        const targetTitle = e.target.dataset.target.toLowerCase();
        const found = articles.find(
          (a) => a.title.toLowerCase() === targetTitle,
        );
        if (found) {
          currentSection = found.section;
          currentArticleId = found.id;
          overlay
            .querySelectorAll(".wiki-tab")
            .forEach((t) => t.classList.remove("active"));
          overlay
            .querySelector(`[data-section="${currentSection}"]`)
            .classList.add("active");
          renderSidebar();
          renderArticle(found);
        } else {
          alert(`The article "${targetTitle}" has not been written yet.`);
        }
      };
    });
  };

  const q = query(collection(db, "wiki_articles"));
  const unsubscribe = onSnapshot(q, (snap) => {
    articles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderSidebar();
  });

  overlay.querySelectorAll(".wiki-tab").forEach((tab) => {
    tab.onclick = () => {
      overlay
        .querySelectorAll(".wiki-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentSection = tab.dataset.section;
      currentArticleId = null;
      articleBody.innerHTML = `<h2 style="color: #ccc; text-align: center; margin-top: 20%;">Select an article to begin.</h2>`;
      renderSidebar();
    };
  });

  const minBtn = overlay.querySelector("#wiki-minimize");
  minBtn.onmouseenter = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))");
  minBtn.onmouseleave = () =>
    (minBtn.style.background =
      "linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))");
  minBtn.onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false;
    overlay.style.display = "none";
    syncWikiTaskbar();
  };

  const closeBtn = overlay.querySelector("#wiki-close");
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
    unsubscribe();
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
