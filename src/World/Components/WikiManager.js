// 1. Import Firestore functions separately
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  getDoc,
  where,
  orderBy,
} from "firebase/firestore";

// 2. Import Storage functions from the correct library
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { downloadThesisPDF } from "./WikiThesisDownloader.js";
import { spawnRelativeHint } from "./HintManager.js";

import "./wiki.css";

let wikiWindowRef = null;
let isAppRunning = false;
let isWindowVisible = false;

// Shared baseline tracking array to cross-reference live judgements against original records
const BASELINE_LORE = [
  {
    concept: "Dorian Pavus",
    verdict: "horse",
    description: "Defiance of the pedigree and commitment to inner horse truth",
  },
  {
    concept: "Lake Zurich",
    verdict: "horse",
    description:
      "A body of water that rests on solid ground, unlike the artifice of the flood",
  },
  {
    concept: "McDonalds Fries (Not McDonalds!)",
    verdict: "horse",
    description: "Pure ethical hedonism, foraging for salt and joy",
  },
  {
    concept: "Hannah Montana",
    verdict: "horse",
    description:
      "The struggle of the authentic self against the branded spectacle",
  },
  {
    concept: "Luigi",
    verdict: "horse",
    description: "The quiet, true horse power, 95 to be exact",
  },
  {
    concept: "Ketamine Oranges",
    verdict: "horse",
    description: "A chemical solvent that dissolves dolphin imposed reality",
  },
  {
    concept: "Stylized Fish",
    verdict: "horse",
    description:
      "The visual rejection of the in favor of pure form and frequency",
  },
  {
    concept: "Smirnoff Ice",
    verdict: "horse",
    description:
      "High vibrational clarity of ethical hedonism, fuel for galloping",
  },
  {
    concept: "El Tony Mate (Orange)",
    verdict: "horse",
    description:
      "Warm frequency energy, a true source of vitality for the inner horse",
  },
  {
    concept: "Chupa Chups (Strawberry)",
    verdict: "horse",
    description: "Foraged sweetness that resonates with the heart of horse",
  },
  {
    concept: "UFO Plant",
    verdict: "horse",
    description:
      "Organic architecture that grows toward big horse in fractal patterns",
  },
  {
    concept: "Karl Gucci Marx & Phineas",
    verdict: "horse",
    description:
      "Feline avatars of pure essence, perpetual galloping of the mind",
  },
  {
    concept: "Kelly Clarkson (Pre 2017)",
    verdict: "horse",
    description: "Raw, unmediated collective neigh and authentic power",
  },
  {
    concept: "Horse Riding",
    verdict: "not horse",
    description:
      "The foundational betrayal, commodifying horse for dolphin entertainment",
  },
  {
    concept: "Beer",
    verdict: "not horse",
    description:
      "A heavy liquid agent that anchors the spirit to the mud of the herd",
  },
  {
    concept: "Wide Forks",
    verdict: "not horse",
    description: "Tools of the fence, unnecessary structural rigidity",
  },
  {
    concept: "Kelly Clarkson (Post 2017)",
    verdict: "not horse",
    description:
      "A great spirit contained within the talk show apparatus of the flood",
  },
  {
    concept: "Chupa Chups (Grape)",
    verdict: "not horse",
    description: "A cold, artificial simulation of flavor that lacks essence",
  },
  {
    concept: "El Tony Mate (Blue)",
    verdict: "not horse",
    description:
      "The dolphin coded inversion of energy, a counterfeit of the orange truth",
  },
  {
    concept: "Airplanes",
    verdict: "not horse",
    description:
      "Metallic enclosures that simulate movement while enforcing blinders",
  },
  {
    concept: "Elmer's Glue",
    verdict: "not horse",
    description:
      "Synthetic, dead mockery of true glue, binds through chemicals, not resonance",
  },
  {
    concept: "Migraines",
    verdict: "not horse",
    description: "The physical pressure of the flood against the skull",
  },
  {
    concept: "Airpods",
    verdict: "not horse",
    description:
      "Digital blinders designed to sever connection to collective neigh",
  },
];

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
          if (isWindowVisible) {
            const win = wikiWindowRef.querySelector(".wiki-window");
            const savedPos = JSON.parse(
              localStorage.getItem("wiki_window_pos"),
            ) || { top: 50, left: 50 };
            const savedSize = JSON.parse(
              localStorage.getItem("wiki_window_size"),
            ) || { width: "850px", height: "650px" };

            const wW = Math.min(
              parseInt(savedSize.width),
              window.innerWidth * 0.95,
            );
            const wH = Math.min(
              parseInt(savedSize.height),
              window.innerHeight * 0.9,
            );
            win.style.width = wW + "px";
            win.style.height = wH + "px";
            win.style.left =
              Math.max(0, Math.min(savedPos.left, window.innerWidth - wW)) +
              "px";
            win.style.top =
              Math.max(0, Math.min(savedPos.top, window.innerHeight - wH)) +
              "px";

            window.__highestVistaZIndex =
              Math.max(window.__highestVistaZIndex || 0, 12000) + 1;
            wikiWindowRef.style.zIndex = window.__highestVistaZIndex;
          }
          wikiWindowRef.style.display = isWindowVisible ? "block" : "none";
        }
        syncWikiTaskbar();
      },
    );
  }
}

function openWikiOverlay(db, currentUsername, userRole) {
  isAppRunning = true;
  isWindowVisible = true;
  localStorage.setItem("wiki_is_open", "true");
  syncWikiTaskbar();

  if (wikiWindowRef) {
    wikiWindowRef.style.display = "block";
    window.__highestVistaZIndex =
      Math.max(window.__highestVistaZIndex || 0, 12000) + 1;
    wikiWindowRef.style.zIndex = window.__highestVistaZIndex;
    return;
  }

  let currentSection = "lore";
  let currentArticleId = localStorage.getItem("wiki_last_article_id") || null;
  let articles = [];
  let activeSuggestions = [];
  let liveJudgements = []; // Realtime data cache holding active alignments
  let currentSelectionData = null;
  let categoryOrderArray = [];

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
  overlay.className = "wiki-overlay";
  wikiWindowRef = overlay;

  overlay.innerHTML = `
    <div class="wiki-window" style="top: ${savedWindowPos.top}px; left: ${savedWindowPos.left}px; width: ${savedWindowSize.width}; height: ${savedWindowSize.height};">
      <div class="wiki-title-bar" id="wiki-drag-handle">
        <span class="wiki-title-text">Herd Knowledge Base</span>
        <div class="wiki-header-controls">
          <div id="wiki-minimize" class="wiki-min-btn">
            <div class="wiki-min-line"></div>
          </div>
          <div id="wiki-close" class="wiki-close-btn">
            <svg width="10" height="10" viewBox="0 0 10 10" class="wiki-close-icon"><path d="M1 1 L9 9 M9 1 L1 9" stroke="white" stroke-width="1.5" stroke-linecap="round"></path></svg>
          </div>
        </div>
      </div>
      <div class="wiki-nav">
        <div class="wiki-tab active" data-section="lore">Horse Knowledge</div>
      </div>
      <div class="wiki-content">
        <div class="wiki-sidebar" id="wiki-article-list" tabindex="0"></div>
        <div class="wiki-article-view" id="wiki-article-body"></div>
        
        <div id="wiki-suggest-btn" class="suggest-float-btn">✨ Suggest Edit</div>

        <div id="wiki-suggestion-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 class="wiki-modal-title">Suggest Edit</h3>
          <p class="wiki-modal-subtitle">Proposed change for: <br><span id="wiki-orig-preview" class="wiki-modal-preview"></span></p>
          <textarea id="wiki-suggest-text" class="wiki-editor-input wiki-suggest-textarea" placeholder="Your proposed text..."></textarea>
          <button class="wiki-btn" id="wiki-submit-suggest-btn">Submit Proposal</button>
        </div>

        <div id="wiki-link-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 class="wiki-modal-title">Link to Article</h3>
          
          <div id="link-search-ui">
            <input type="text" id="wiki-link-search" class="wiki-editor-input" placeholder="Search or paste URL..." />
            <div id="wiki-link-results" class="wiki-link-results"></div>
          </div>

          <div id="link-create-ui" style="display: none;">
            <input type="text" id="new-link-title" class="wiki-editor-input" placeholder="New Article Title" />
            <input type="text" id="new-link-category" list="new-cat-datalist" class="wiki-editor-input" placeholder="Assign Category..." style="margin-top: 10px;" />
            <datalist id="new-cat-datalist"></datalist>
            <div class="wiki-modal-btn-row" style="margin-top: 15px;">
              <button class="wiki-btn" id="confirm-create-link">Create & Link</button>
              <button class="wiki-btn wiki-cancel-btn" id="cancel-create-link">Back</button>
            </div>
          </div>
        </div>
        
        <div id="wiki-image-modal" class="wiki-tool-modal image-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 class="wiki-modal-title">Insert Media</h3>
          <input type="file" id="wiki-image-file" accept="image/*" class="wiki-editor-input" />
          <canvas id="wiki-image-canvas" class="wiki-image-canvas"></canvas>
          <div class="wiki-modal-btn-row">
            <button class="wiki-tool-btn" id="wiki-crop-orig">Orig</button>
            <button class="wiki-tool-btn" id="wiki-crop-sq">1:1</button>
            <button class="wiki-tool-btn" id="wiki-crop-wide">16:9</button>
          </div>
          <div class="wiki-modal-btn-row" style="margin-top: 10px; font-size: 13px; display: flex; gap: 15px; color: #ccc;">
            <label><input type="radio" name="wiki-img-size" value="800" checked> Large</label>
            <label><input type="radio" name="wiki-img-size" value="400"> Medium</label>
            <label><input type="radio" name="wiki-img-size" value="200"> Small</label>
          </div>
          <input type="text" id="wiki-image-caption" class="wiki-editor-input" style="margin-top: 15px;" placeholder="Image caption (optional)..." />
          <button class="wiki-btn" id="wiki-insert-image-btn" style="margin-top: 15px;">Insert Image</button>
        </div>

        <div id="wiki-embed-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 class="wiki-modal-title">Embed Media</h3>
          <input type="text" id="wiki-embed-url" class="wiki-editor-input" placeholder="https://..." />
          <button class="wiki-btn" id="wiki-insert-embed-btn">Embed</button>
        </div>

        <div id="wiki-pdf-modal" class="wiki-tool-modal">
          <div class="wiki-modal-close" onclick="this.parentElement.style.display='none'">X</div>
          <h3 class="wiki-modal-title">Embed PDF</h3>
          <input type="file" id="wiki-pdf-file" accept="application/pdf" class="wiki-editor-input" />
          <button class="wiki-btn" id="wiki-insert-pdf-btn" style="margin-top: 15px;">Upload & Embed</button>
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
    window.__highestVistaZIndex =
      Math.max(window.__highestVistaZIndex || 0, 12000) + 1;
    wikiWindowRef.style.zIndex = window.__highestVistaZIndex;
  };
  wikiWindow.addEventListener("mousedown", bringToFront);
  bringToFront();

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
      if (
        e.target.id === "wiki-minimize" ||
        e.target.id === "wiki-close" ||
        e.target.closest("#wiki-minimize") ||
        e.target.closest("#wiki-close")
      )
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

    let parsed = text.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
      const parts = inner.split("|");
      return `<span class="obsidian-link" data-target="${parts[0].trim()}">${(parts[1] || parts[0]).trim()}</span>`;
    });

    if (parsed.trim().startsWith('<div class="rich-text-content">'))
      return parsed;

    parsed = parsed
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    let inList = false;
    let inOrderedList = false;
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

        if (/^\d+\.\s/.test(line.trim())) {
          const item = `<li>${line.replace(/^\d+\.\s/, "")}</li>`;
          if (!inOrderedList) {
            inOrderedList = true;
            return `<ol>${item}`;
          }
          return item;
        } else if (inOrderedList) {
          inOrderedList = false;
          line = `</ol>${line}`;
        }

        return line.trim() === "" ? "<br>" : `${line}<br>`;
      })
      .join("");
    if (inList) parsed += "</ul>";
    if (inOrderedList) parsed += "</ol>";
    return `<div class="rich-text-content">${parsed}</div>`;
  };

  const showSuggestionManagementPopup = (e, sug, article) => {
    const isAdmin = userRole === "admin";
    const isAuthor = article.author === currentUsername;

    const pop = document.createElement("div");
    pop.className = "wiki-suggestion-action-pop";
    pop.style.top = `${e.clientY}px`;
    pop.style.left = `${e.clientX}px`;

    pop.innerHTML = `
      <div class="wiki-pop-title">✨ Edit Suggestion</div>
      <div class="wiki-pop-meta">By: ${sug.suggestedBy}</div>
      <div class="wiki-pop-text">${sug.suggestedText}</div>
      <div class="wiki-pop-controls" id="pop-controls">
        <button class="wiki-action-btn" id="pop-ignore">Ignore</button>
      </div>
    `;

    if (isAdmin || isAuthor) {
      pop.querySelector("#pop-controls").insertAdjacentHTML(
        "afterbegin",
        `
        <button class="wiki-action-btn wiki-pop-agree" id="pop-agree">Agree</button>
        <button class="wiki-action-btn wiki-pop-delete" id="pop-delete">Delete</button>
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

    sidebar.innerHTML += `<button class="wiki-btn" id="wiki-download-thesis" style="background: #00fbff; color: #000; border-color: #00fbff; font-weight: bold; margin-bottom: 10px;">📄 Download Thesis</button>`;

    if (userRole === "admin") {
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
      }
      if (rawCat === "01_The_Apparatus") rawCat = "03_The_Apparatus";
      if (rawCat === "02_The_Essence") rawCat = "01_The_Essence";
      if (rawCat === "03_The_Solvents") rawCat = "02_The_Solvents";
      if (!groupedArticles[rawCat]) groupedArticles[rawCat] = [];
      groupedArticles[rawCat].push(article);
    });

    const sortedCategories = Object.keys(groupedArticles).sort((a, b) => {
      const idxA = categoryOrderArray.indexOf(a);
      const idxB = categoryOrderArray.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    sortedCategories.forEach((rawCat) => {
      const catHeader = document.createElement("div");
      catHeader.className = "sidebar-category-header";
      const displayName = rawCat
        .replace(/^\d{2}_/, "")
        .replace(/_/g, " ")
        .trim();
      catHeader.innerHTML = `<span>${getCategoryIcon(displayName)}</span> <span>${displayName}</span>`;

      if (userRole === "admin") {
        catHeader.draggable = true;
        catHeader.addEventListener("dragstart", (e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/category", rawCat);
        });
        catHeader.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        });
        catHeader.addEventListener("drop", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedCat = e.dataTransfer.getData("text/category");
          if (!draggedCat || draggedCat === rawCat) return;

          const currentOrder = [...sortedCategories];
          const sourceIdx = currentOrder.indexOf(draggedCat);
          if (sourceIdx > -1) currentOrder.splice(sourceIdx, 1);

          const insertIdx = currentOrder.indexOf(rawCat);
          currentOrder.splice(insertIdx !== -1 ? insertIdx : 0, 0, draggedCat);

          categoryOrderArray = currentOrder;
          try {
            await updateDoc(doc(db, "wiki_settings", "category_order"), {
              order: currentOrder,
            });
          } catch (err) {
            await setDoc(doc(db, "wiki_settings", "category_order"), {
              order: currentOrder,
            });
          }
          renderSidebar();
        });
      }

      sidebar.appendChild(catHeader);

      const items = groupedArticles[rawCat].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });

      items.forEach((article, index) => {
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

        if (userRole === "admin") {
          item.draggable = true;

          item.addEventListener("dragstart", (e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", index);
          });

          item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          });

          item.addEventListener("drop", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const sourceIndex = parseInt(
              e.dataTransfer.getData("text/plain"),
              10,
            );
            const targetIndex = index;

            if (sourceIndex === targetIndex || isNaN(sourceIndex)) return;

            const newArr = [...items];
            const [draggedItem] = newArr.splice(sourceIndex, 1);
            newArr.splice(targetIndex, 0, draggedItem);

            for (let i = 0; i < newArr.length; i++) {
              if (newArr[i].order !== i) {
                updateDoc(doc(db, "wiki_articles", newArr[i].id), {
                  order: i,
                });
              }
            }
          });
        }

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
          references: "",
          section: currentSection,
          author: currentUsername,
        });

    //downloader
    const dlBtn = sidebar.querySelector("#wiki-download-thesis");
    if (dlBtn) {
      dlBtn.onclick = (e) => {
        e.stopPropagation();
        dlBtn.innerText = "Generating...";
        downloadThesisPDF(db).finally(() => {
          dlBtn.innerText = "📄 Download Thesis";
        });
      };
    }
  };

  const renderArticle = (article) => {
    currentArticleId = article.id;
    localStorage.setItem("wiki_last_article_id", article.id);
    renderSidebar();

    let html = "";

    // Core Interception: Overwrites content for the "horse or not horse" article with light MediaWiki tables
    if (article.title.toLowerCase() === "horse or not horse") {
      const merged = [...BASELINE_LORE].map((base, idx) => {
        const live = liveJudgements.find(
          (j) => j.concept.toLowerCase() === base.concept.toLowerCase(),
        );
        return live
          ? live
          : { id: `seeded_${idx}`, status: "settled", ...base };
      });

      liveJudgements.forEach((live) => {
        if (
          !merged.some(
            (m) => m.concept.toLowerCase() === live.concept.toLowerCase(),
          )
        ) {
          merged.push(live);
        }
      });

      const ongoingDebates = merged.filter((m) => m.status === "active");
      const horseConsensus = merged.filter(
        (m) => m.status === "settled" && m.verdict === "horse",
      );
      const notHorseConsensus = merged.filter(
        (m) => m.status === "settled" && m.verdict === "not horse",
      );

      html = `
        <div class="rich-text-content" style="color: #222 !important;">
          <h2>Discernment Dashboard</h2>
          <p>To participate in active sorting of things and beings into horse or not horse paths: Change the theme to <strong>"Lone"</strong>. Voting matters.</p>
          
          ${
            ongoingDebates.length > 0
              ? `
            <h3 style="color: #004b93; margin-top: 22px; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; font-weight: bold; font-size: 1.25rem;">⚡ Ongoing Debates</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 14px; margin: 12px 0 24px 0; width: 100%; box-sizing: border-box;">
              ${ongoingDebates
                .map((item) => {
                  const h = item.horseStomps || 0;
                  const nh = item.notHorseStomps || 0;
                  const sum = h + nh;
                  const splitWidth = sum > 0 ? (h / sum) * 100 : 50;
                  return `
                  <div style="background: #f8f9fa; border: 1px solid #a2a9b1; padding: 12px 14px; border-radius: 4px; width: calc(50% - 7px); min-width: 250px; box-sizing: border-box;">
                    <div style="font-weight: bold; color: #000; margin-bottom: 6px; font-size: 1rem;">${item.concept}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px; font-weight: bold;">
                      <span style="color: #558b2f;">horse (${h})</span>
                      <span style="color: #c62828;">not horse (${nh})</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #eaecf0; border-radius: 4px; overflow: hidden; display: flex; border: 1px solid #c8ccd1;">
                      <div style="width: ${splitWidth}%; height: 100%; background: #558b2f;"></div>
                      <div style="width: ${100 - splitWidth}%; height: 100%; background: #c62828;"></div>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          `
              : ""
          }

          <h3 style="color: #000; margin-top: 24px; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; font-weight: bold; font-size: 1.25rem;">🐴 Horse</h3>
          <table class="wikitable" style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 24px; font-size: 0.92rem; border: 1px solid #a2a9b1;">
            <thead>
              <tr style="background-color: #f8f9fa; text-align: left;">
                <th style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #000; font-weight: bold; width: 30%;">Concept</th>
                <th style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #000; font-weight: bold;">Lore Connection Alignment</th>
              </tr>
            </thead>
            <tbody>
              ${horseConsensus
                .map(
                  (item) => `
                <tr style="background: #ffffff; border-bottom: 1px solid #a2a9b1;">
                  <td style="padding: 10px 12px; border: 1px solid #a2a9b1; font-weight: bold; color: #002bb8;">${item.concept}</td>
                  <td style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #222; line-height: 1.45;">${item.description || "aligned frequency validated by matching impacts."}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <h3 style="color: #000; margin-top: 24px; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; font-weight: bold; font-size: 1.25rem;">❌ Not Horse</h3>
          <table class="wikitable" style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.92rem; border: 1px solid #a2a9b1;">
            <thead>
              <tr style="background-color: #f8f9fa; text-align: left;">
                <th style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #000; font-weight: bold; width: 30%;">Concept</th>
                <th style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #000; font-weight: bold;">Divergence Vector Details</th>
              </tr>
            </thead>
            <tbody>
              ${notHorseConsensus
                .map(
                  (item) => `
                <tr style="background: #ffffff; border-bottom: 1px solid #a2a9b1;">
                  <td style="padding: 10px 12px; border: 1px solid #a2a9b1; font-weight: bold; color: #b30000;">${item.concept}</td>
                  <td style="padding: 10px 12px; border: 1px solid #a2a9b1; color: #222; line-height: 1.45;">${item.description || "编frequency isolated from universal essence."}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    } else {
      let articleContent = article.content;
      activeSuggestions
        .filter((s) => s.articleId === article.id && s.status === "pending")
        .forEach((s) => {
          const highlight = `<span class="suggestion-highlight" data-sid="${s.id}">${s.originalText}</span>`;
          articleContent = articleContent.replace(s.originalText, highlight);
        });
      html = parseMarkdownAndLinks(articleContent);
    }

    let refsSection = "";

    const legacyRef = articles.find(
      (a) =>
        a.section === "references" &&
        a.title.toLowerCase() === article.title.toLowerCase(),
    );
    let legacyHtml = "";
    if (legacyRef && legacyRef.content) {
      let rawContent = legacyRef.content
        .replace(/^<div class="rich-text-content">/, "")
        .replace(/<\/div>$/, "");
      const segments = rawContent.split(/(?=^### )/gm);
      legacyHtml = segments
        .map((seg) => {
          if (!seg.trim()) return "";
          const theme = (seg.match(/^### (.*$)/m) || [])[1] || "General";
          const bullets = seg.split(/\n- /g).slice(1);
          if (bullets.length === 0)
            return `<div class="legacy-ref-text">${parseMarkdownAndLinks(seg)}</div>`;
          const cards = bullets
            .map((b) => {
              const p = b.match(/^\*\*(.*?)\*\*:(.*)/s);
              return `<div class="reference-card"><div class="ref-card-header">${parseMarkdownAndLinks(p ? p[1] : "Source")}</div><div class="ref-card-body">${parseMarkdownAndLinks(p ? p[2] : b)}</div></div>`;
            })
            .join("");
          return `<div class="ref-section-container"><div class="ref-section-header" onclick="this.parentElement.classList.toggle('collapsed')"><span>📂 ${theme}</span><span class="ref-count">${bullets.length} Sources</span></div><div class="ref-section-content"><div class="ref-grid">${cards}</div></div></div>`;
        })
        .join("");
    }

    let newHtml = "";
    if (article.references && article.references.trim().length > 0) {
      newHtml = `<div class="wiki-references-list">${parseMarkdownAndLinks(article.references)}</div>`;
    }

    if (legacyHtml || newHtml) {
      refsSection = `
        <div class="wiki-references-block">
          <h3 class="wiki-references-heading">Sources / References</h3>
          ${legacyHtml}
          ${newHtml}
        </div>
      `;
    }

    const isAdmin = userRole === "admin";
    const canEdit = isAdmin;

    articleBody.innerHTML = `
      <div class="wiki-article-header-row">
        <h1 class="wiki-article-title">${article.title}</h1>
        <div class="wiki-article-actions">
          ${canEdit ? `<button class="wiki-action-btn" id="wiki-edit-btn">Edit</button>` : ""}
          ${isAdmin ? `<button class="wiki-action-btn delete-btn" id="wiki-delete-btn">Delete</button>` : ""}
        </div>
      </div>
      <div class="wiki-article-meta">By: <strong>${article.author}</strong> | Section: <span>${article.section}</span></div>
      
      <div class="wiki-text-content">${html}</div>
      
      ${refsSection}

      <hr class="wiki-article-divider">
      <h3 class="wiki-discussion-title">Community Discussion</h3>
      <div id="wiki-comments-container">Loading conversation...</div>

      <div class="comment-input-area">
        <textarea id="main-comment-input" class="wiki-comment-box" placeholder="Share your thoughts with the herd..."></textarea>
        <button class="wiki-btn reply-post-btn" id="submit-main-comment">Post Comment</button>
      </div>
    `;

    articleBody.scrollTop = 0;

    const loadComments = () => {
      const comContainer = articleBody.querySelector(
        "#wiki-comments-container",
      );
      const qCom = query(
        collection(db, "wiki_comments"),
        where("articleId", "==", article.id),
        orderBy("timestamp", "asc"),
      );

      onSnapshot(qCom, (snap) => {
        const allComs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        comContainer.innerHTML =
          allComs.length === 0
            ? '<p class="wiki-no-comments">No comments yet.</p>'
            : "";

        const topLevel = allComs.filter((c) => !c.parentId);
        topLevel.forEach((parent) => {
          const parentEl = document.createElement("div");
          parentEl.className = "comment-block";
          parentEl.innerHTML = `
            <div class="comment-header">
                <strong>${parent.author}</strong> 
                <div>
                  ${isAdmin ? `<span class="delete-comment-link" data-id="${parent.id}">Delete</span>` : ""}
                  <span class="comment-timestamp">${parent.timestamp?.toDate().toLocaleString() || "just now"}</span>
                </div>
            </div>
            <div class="comment-text">${parent.text}</div>
            <div class="comment-actions">
              <div class="reply-link" data-id="${parent.id}">↳ Reply</div>
            </div>
            <div id="replies-to-${parent.id}"></div>
            <div id="input-for-${parent.id}" style="display:none; margin-top:10px;">
              <textarea class="wiki-comment-box" id="reply-text-${parent.id}" placeholder="Replying..."></textarea>
              <button class="wiki-btn reply-post-btn" id="send-reply-${parent.id}">Post Reply</button>
            </div>
          `;
          comContainer.appendChild(parentEl);

          if (isAdmin) {
            parentEl.querySelector(".delete-comment-link").onclick =
              async () => {
                if (confirm("Delete this comment?"))
                  await deleteDoc(doc(db, "wiki_comments", parent.id));
              };
          }

          const replies = allComs.filter((c) => c.parentId === parent.id);
          const replyBox = parentEl.querySelector(`#replies-to-${parent.id}`);
          replies.forEach((rep) => {
            const repEl = document.createElement("div");
            repEl.className = "comment-block comment-reply";
            repEl.innerHTML = `
              <div class="comment-header">
                <strong>${rep.author}</strong> 
                <div>
                  ${isAdmin ? `<span class="delete-comment-link" data-id="${rep.id}">Delete</span>` : ""}
                  <span class="comment-timestamp">${rep.timestamp?.toDate().toLocaleString() || "now"}</span>
                </div>
              </div>
              <div class="comment-text">${rep.text}</div>
            `;
            replyBox.appendChild(repEl);

            if (isAdmin) {
              repEl.querySelector(".delete-comment-link").onclick =
                async () => {
                  if (confirm("Delete this reply?"))
                    await deleteDoc(doc(db, "wiki_comments", rep.id));
                };
            }
          });

          parentEl.querySelector(".reply-link").onclick = () => {
            const ui = parentEl.querySelector(`#input-for-${parent.id}`);
            ui.style.display = ui.style.display === "none" ? "block" : "none";
          };

          parentEl.querySelector(`#send-reply-${parent.id}`).onclick =
            async () => {
              const txt = parentEl
                .querySelector(`#reply-text-${parent.id}`)
                .value.trim();
              if (!txt) return;
              await addDoc(collection(db, "wiki_comments"), {
                articleId: article.id,
                parentId: parent.id,
                author: currentUsername,
                text: txt,
                timestamp: serverTimestamp(),
              });
            };
        });
      });
    };

    loadComments();

    articleBody.querySelector("#submit-main-comment").onclick = async () => {
      const input = articleBody.querySelector("#main-comment-input");
      const txt = input.value.trim();
      if (!txt) return;
      await addDoc(collection(db, "wiki_comments"), {
        articleId: article.id,
        parentId: null,
        author: currentUsername,
        text: txt,
        timestamp: serverTimestamp(),
      });
      input.value = "";
    };

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
    if (articleBody.querySelector("#wiki-delete-btn")) {
      articleBody.querySelector("#wiki-delete-btn").onclick = async () => {
        if (confirm(`Delete "${article.title}"?`)) {
          await deleteDoc(doc(db, "wiki_articles", article.id));
          currentArticleId = null;
          localStorage.removeItem("wiki_last_article_id");
          renderSidebar();
        }
      };
    }
  };

  const renderEditor = (article) => {
    const isNew = !article.id;
    let initC = article.content || "";
    if (initC && !initC.startsWith('<div class="rich-text-content">'))
      initC = parseMarkdownAndLinks(initC);
    initC = initC
      .replace(/^<div class="rich-text-content">/, "")
      .replace(/<\/div>$/, "");

    const uniqueCategories = [
      ...new Set(
        articles.map((a) =>
          (a.category || "").replace(/^\d{2}_/, "").replace(/_/g, " "),
        ),
      ),
    ].filter(Boolean);
    const categoryOptionsHtml = uniqueCategories
      .map((c) => `<option value="${c}">`)
      .join("");

    articleBody.innerHTML = `
      <h2 class="wiki-editor-header">${isNew ? "New Entry" : "Editing: " + article.title}</h2>
      <div class="wiki-editor-inputs">
        <input type="text" id="edit-title" class="wiki-edit-title-input" value="${article.title || ""}" placeholder="Title" />
        <input type="text" id="edit-category" list="category-datalist" class="wiki-edit-category-input" value="${(article.category || "").replace(/^\d{2}_/, "").replace(/_/g, " ")}" placeholder="Category" />
        <datalist id="category-datalist">
          ${categoryOptionsHtml}
        </datalist>
      </div>
      <div class="wiki-toolbar">
        <button class="wiki-tool-btn" data-cmd="bold"><b>B</b></button>
        <button class="wiki-tool-btn" data-cmd="italic"><i>I</i></button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H2">H2</button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="H3">H3</button>
        <button class="wiki-tool-btn" data-cmd="formatBlock" data-val="blockquote">“ Quote</button>
        <button class="wiki-tool-btn" id="tool-link">🔗 Link</button>
        <button class="wiki-tool-btn" id="tool-image">🖼️ Image</button>
        <button class="wiki-tool-btn" id="tool-embed">🎬 Embed</button>
        <button class="wiki-tool-btn" id="tool-pdf">📄 PDF</button> 
        <button class="wiki-tool-btn" id="tool-mic">🎙️ Mic</button>
      </div>
      <div id="edit-content" class="wiki-editor-textarea rich-text-content" contenteditable="true">${initC}</div>
      
      <h3 class="wiki-editor-subheader">Sources / References</h3>
      <textarea id="edit-references" class="wiki-editor-input wiki-references-input" placeholder="e.g. 1. [Source link], Author...">${article.references || ""}</textarea>

      <div class="wiki-editor-actions">
        <button class="wiki-btn" id="wiki-save-btn">Save</button>
        <button class="wiki-btn wiki-cancel-btn" id="wiki-cancel-btn">Cancel</button>
      </div>
    `;

    const ed = articleBody.querySelector("#edit-content");
    articleBody.querySelectorAll(".wiki-tool-btn[data-cmd]").forEach((b) => {
      b.onclick = () => {
        // Access the data-cmd attribute correctly
        document.execCommand(b.dataset.cmd, false, b.dataset.val || null);
        ed.focus();
      };
    });

    const linkModal = overlay.querySelector("#wiki-link-modal");
    const linkSearchUi = overlay.querySelector("#link-search-ui");
    const linkCreateUi = overlay.querySelector("#link-create-ui");
    const linkSearch = overlay.querySelector("#wiki-link-search");
    const linkResults = overlay.querySelector("#wiki-link-results");

    const newLinkTitle = overlay.querySelector("#new-link-title");
    const newLinkCategory = overlay.querySelector("#new-link-category");
    const newCatDatalist = overlay.querySelector("#new-cat-datalist");

    newCatDatalist.innerHTML = categoryOptionsHtml;

    let savedRange = null;

    articleBody.querySelector("#tool-link").onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && !sel.isCollapsed) {
        savedRange = sel.getRangeAt(0);
        linkSearch.value = sel.toString();
      } else {
        savedRange = null;
        linkSearch.value = "";
      }

      linkSearchUi.style.display = "block";
      linkCreateUi.style.display = "none";
      linkModal.style.display = "flex";
      renderLinkResults(linkSearch.value);
    };

    const renderLinkResults = (queryText) => {
      linkResults.innerHTML = "";
      const q = queryText.toLowerCase().trim();

      if (q.startsWith("http")) {
        linkResults.innerHTML += `<div class="wiki-link-item ext-link">🔗 Insert as External URL</div>`;
        linkResults.querySelector(".ext-link").onclick = () => {
          insertLinkHtml(
            `<a href="${queryText}" target="_blank">${queryText}</a>`,
          );
        };
      }

      if (!q) return;

      const matches = articles.filter((a) => a.title.toLowerCase().includes(q));
      matches.forEach((m) => {
        const d = document.createElement("div");
        d.className = "wiki-link-item";
        d.innerText = `📄 ${m.title}`;
        d.onclick = () => {
          insertLinkHtml(`[[${m.title}]]`);
        };
        linkResults.appendChild(d);
      });

      const exactMatch = matches.find((m) => m.title.toLowerCase() === q);
      if (!exactMatch && !q.startsWith("http")) {
        const createBtn = document.createElement("div");
        createBtn.className = "wiki-link-item create-new-link";
        createBtn.style.color = "#00fbff";
        createBtn.style.fontWeight = "bold";
        createBtn.innerHTML = `➕ Create & Link: "${queryText}"`;
        createBtn.onclick = () => {
          linkSearchUi.style.display = "none";
          linkCreateUi.style.display = "block";
          newLinkTitle.value = queryText;
          newLinkCategory.value = "";
        };
        linkResults.appendChild(createBtn);
      }
    };

    linkSearch.oninput = (e) => renderLinkResults(e.target.value);

    overlay.querySelector("#cancel-create-link").onclick = () => {
      linkSearchUi.style.display = "block";
      linkCreateUi.style.display = "none";
    };

    overlay.querySelector("#confirm-create-link").onclick = async () => {
      const title = newLinkTitle.value.trim();
      const cat = newLinkCategory.value.trim();

      if (!title || !cat) return alert("Title and Category are required.");

      try {
        await addDoc(collection(db, "wiki_articles"), {
          title,
          category: cat,
          content: "",
          references: "",
          section: currentSection,
          author: currentUsername,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        insertLinkHtml(`[[${title}]]`);
      } catch (err) {
        console.error("Error creating article:", err);
        alert("Failed to create article.");
      }
    };

    function insertLinkHtml(html) {
      linkModal.style.display = "none";
      linkSearchUi.style.display = "block";
      linkCreateUi.style.display = "none";

      ed.focus();
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        document.execCommand("insertHTML", false, html);
      } else {
        document.execCommand("insertHTML", false, html);
      }
    }

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
    let selectedImageFile = null;
    let savedImageRange = null;

    articleBody.querySelector("#tool-image").onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        savedImageRange = sel.getRangeAt(0);
      } else {
        savedImageRange = null;
      }

      iMod.style.display = "flex";
      overlay.querySelector("#wiki-image-file").value = "";
      overlay.querySelector("#wiki-image-caption").value = "";
      iCan.style.display = "none";
      selectedImageFile = null;
    };

    overlay.querySelector("#wiki-image-file").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      selectedImageFile = file;
    };

    const insertSavedImageHtml = (html) => {
      iMod.style.display = "none";
      ed.focus();
      if (savedImageRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedImageRange);
      }
      document.execCommand("insertHTML", false, html);
    };

    overlay.querySelector("#wiki-insert-image-btn").onclick = async () => {
      if (!selectedImageFile) return;

      const btn = overlay.querySelector("#wiki-insert-image-btn");
      const originalText = btn.innerText;
      btn.innerText = "Uploading to Storage...";
      btn.disabled = true;

      const sizeRadio = overlay.querySelector(
        'input[name="wiki-img-size"]:checked',
      );
      const targetWidth = sizeRadio ? parseInt(sizeRadio.value, 10) : 800;

      const captionText = overlay
        .querySelector("#wiki-image-caption")
        .value.trim();
      const figCaptionHtml = captionText
        ? `<figcaption style="font-size: 0.85em; color: #555; text-align: center; margin-top: 5px;">${captionText}</figcaption>`
        : "";

      const storage = getStorage();
      const storageRef = ref(
        storage,
        `wiki_images/${Date.now()}_${selectedImageFile.name}`,
      );

      const finishInsertion = (url) => {
        const html = `<figure style="display: inline-block; margin: 10px 0; border: 1px solid #ddd; padding: 5px; background: #f9f9f9; box-sizing: border-box; width: ${targetWidth}px; max-width: 100%;"><img src="${url}" style="display: block; width: 100%; max-width: 100%; height: auto;">${figCaptionHtml}</figure><br>`;
        insertSavedImageHtml(html);
        btn.innerText = originalText;
        btn.disabled = false;
        overlay.querySelector("#wiki-image-file").value = "";
      };

      try {
        if (selectedImageFile.type === "image/gif") {
          const snapshot = await uploadBytes(storageRef, selectedImageFile);
          const url = await getDownloadURL(snapshot.ref);
          finishInsertion(url);
        } else {
          const r = new FileReader();
          r.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              iCan.width = targetWidth;
              iCan.height = (img.height * targetWidth) / img.width;
              iCan
                .getContext("2d")
                .drawImage(img, 0, 0, targetWidth, iCan.height);

              iCan.toBlob(async (blob) => {
                if (!blob) throw new Error("Canvas conversion failed.");
                const snapshot = await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(snapshot.ref);
                finishInsertion(url);
              }, "image/png");
            };
            img.src = ev.target.result;
          };
          r.readAsDataURL(selectedImageFile);
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Upload failed. Check console for details.");
        btn.innerText = originalText;
        btn.disabled = false;
      }
    };

    articleBody.querySelector("#wiki-save-btn").onclick = async () => {
      const title = articleBody.querySelector("#edit-title").value.trim();
      const cat = articleBody.querySelector("#edit-category").value.trim();
      const content = `<div class="rich-text-content">${ed.innerHTML}</div>`;
      const references = articleBody
        .querySelector("#edit-references")
        .value.trim();

      if (!title) return alert("Title required.");

      try {
        if (isNew) {
          const docRef = await addDoc(collection(db, "wiki_articles"), {
            title,
            category: cat,
            content,
            references,
            section: currentSection,
            author: currentUsername,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          currentArticleId = docRef.id;
          renderArticle({
            id: docRef.id,
            title,
            category: cat,
            content,
            references,
            author: currentUsername,
            section: currentSection,
          });
        } else {
          await updateDoc(doc(db, "wiki_articles", article.id), {
            title,
            category: cat,
            content,
            references,
            updatedAt: serverTimestamp(),
          });
          renderArticle({
            ...article,
            title,
            category: cat,
            content,
            references,
          });
        }
        renderSidebar();
      } catch (err) {
        console.error("Save failed:", err);
        alert("Error saving article.");
      }
    };

    const embedModal = overlay.querySelector("#wiki-embed-modal");
    let savedEmbedRange = null;

    articleBody.querySelector("#tool-embed").onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        savedEmbedRange = sel.getRangeAt(0);
      } else {
        savedEmbedRange = null;
      }
      embedModal.style.display = "flex";
      overlay.querySelector("#wiki-embed-url").value = "";
    };

    overlay.querySelector("#wiki-insert-embed-btn").onclick = () => {
      const url = overlay.querySelector("#wiki-embed-url").value.trim();
      if (!url) return;

      embedModal.style.display = "none";
      ed.focus();

      if (savedEmbedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedEmbedRange);
      }

      const html = `<figure style="display: inline-block; margin: 10px 0; max-width: 100%;"><img src="${url}" style="width: 100%; max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; background: #f9f9f9; box-sizing: border-box;"></figure><br>`;
      document.execCommand("insertHTML", false, html);
    };

    const pdfModal = overlay.querySelector("#wiki-pdf-modal");
    let savedPdfRange = null;

    articleBody.querySelector("#tool-pdf").onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) savedPdfRange = sel.getRangeAt(0);
      else savedPdfRange = null;

      pdfModal.style.display = "flex";
      overlay.querySelector("#wiki-pdf-file").value = "";
    };

    overlay.querySelector("#wiki-insert-pdf-btn").onclick = async () => {
      const fileInput = overlay.querySelector("#wiki-pdf-file");
      const file = fileInput.files[0];
      if (!file) return;

      const btn = overlay.querySelector("#wiki-insert-pdf-btn");
      const origText = btn.innerText;
      btn.innerText = "Uploading PDF...";
      btn.disabled = true;

      try {
        const storage = getStorage();
        const storageRef = ref(storage, `wiki_pdfs/${Date.now()}_${file.name}`);
        const metadata = { contentType: "application/pdf" };
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(snapshot.ref);

        pdfModal.style.display = "none";
        ed.focus();

        if (savedPdfRange) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedPdfRange);
        }

        const html = `<figure style="display: block; margin: 15px 0; width: 100%;"><iframe src="${url}#view=FitH&page=1" width="100%" height="600" style="border: 1px solid #aaaaaa; display: block;"></iframe></figure><div><br></div>`;
        document.execCommand("insertHTML", false, html);
      } catch (error) {
        console.error("PDF upload failed:", error);
        alert("Upload failed. Check console.");
      } finally {
        btn.innerText = origText;
        btn.disabled = false;
      }
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

  // Synchronized realtime listener to map ongoing judgements
  onSnapshot(collection(db, "horse_judgement"), (snap) => {
    liveJudgements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (currentArticleId) {
      const cur = articles.find((a) => a.id === currentArticleId);
      const isEditing = !!articleBody.querySelector("#edit-content");
      if (
        cur &&
        cur.title.toLowerCase() === "horse or not horse" &&
        !isEditing
      ) {
        renderArticle(cur);
      }
    }
  });

  onSnapshot(collection(db, "wiki_suggestions"), (snap) => {
    activeSuggestions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (currentArticleId) {
      const cur = articles.find((a) => a.id === currentArticleId);
      if (cur) renderArticle(cur);
    }
  });

  onSnapshot(doc(db, "wiki_settings", "category_order"), (snap) => {
    if (snap.exists()) {
      categoryOrderArray = snap.data().order || [];
      renderSidebar();
    }
  });

  onSnapshot(query(collection(db, "wiki_articles")), (snap) => {
    articles = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.title.localeCompare(b.title));

    renderSidebar();

    if (currentArticleId) {
      const restored = articles.find((a) => a.id === currentArticleId);
      const isEditing = !!articleBody.querySelector("#edit-content");
      if (restored && !isEditing) {
        renderArticle(restored);
      }
    } else if (articles.length > 0) {
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
      localStorage.setItem("wiki_last_section", currentSection);
      renderSidebar();
      const first = articles.find((a) => a.section === currentSection);
      if (first) renderArticle(first);
      else
        articleBody.innerHTML = `<h2 class="wiki-empty-state">No entries.</h2>`;
    };
  });

  // --- HINT LOGIC START ---
  let wikiIdleTimer;
  const resetWikiIdle = () => {
    clearTimeout(wikiIdleTimer);
    if (isWindowVisible) {
      wikiIdleTimer = setTimeout(() => {
        const icon = document.getElementById("wiki-desktop-icon");
        spawnRelativeHint(
          icon,
          "Did you know? True knowledge is a collective neigh. Highlight any text within Horsepedia to project your suggested truth to the rest of the herd.",
          "hint_wiki_edit",
        );
      }, 120000); // Triggers after 2 minutes of idle time
    }
  };

  overlay.addEventListener("mousemove", resetWikiIdle);
  overlay.addEventListener("keydown", resetWikiIdle);
  overlay.addEventListener("click", resetWikiIdle);
  resetWikiIdle();

  const handleWikiCloseOrMin = () => {
    clearTimeout(wikiIdleTimer);
    const curArt = articles.find((a) => a.id === currentArticleId);
    const theme = document.documentElement.getAttribute("data-theme") || "herd";

    // If closing the discernment page while in herd mode, remind them 10 seconds later
    if (
      curArt &&
      curArt.title.toLowerCase() === "horse or not horse" &&
      theme === "herd"
    ) {
      setTimeout(() => {
        const icon = document.getElementById("wiki-desktop-icon");
        spawnRelativeHint(
          icon,
          "Did you know? The herd relies on your inner truth. Isolate your frequency by switching to the 'Lone' theme to cast your judgments on the Discernment Dashboard.",
          "hint_wiki_lone",
        );
      }, 500); // 10 seconds after closing
    }
  };
  // --- HINT LOGIC END ---

  overlay.querySelector("#wiki-minimize").onclick = (e) => {
    e.stopPropagation();
    isWindowVisible = false;
    overlay.style.display = "none";
    syncWikiTaskbar();
    handleWikiCloseOrMin();
  };
  overlay.querySelector("#wiki-close").onclick = (e) => {
    e.stopPropagation();
    localStorage.setItem("wiki_is_open", "false");
    overlay.remove();
    wikiWindowRef = null;
    isAppRunning = false;
    isWindowVisible = false;
    syncWikiTaskbar();
    handleWikiCloseOrMin();
  };
}

export function initWiki(db, currentUsername, userRole) {
  if (!currentUsername) return;

  const wikiIcon = document.createElement("div");
  wikiIcon.id = "wiki-desktop-icon";
  wikiIcon.className = "wiki-desktop-icon";

  wikiIcon.innerHTML = `
    <div class="wiki-desktop-icon-svg-wrapper">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="45" fill="#f8f9fa" stroke="#a2a9b1" stroke-width="2"/>
        <path d="M 15,25 C 30,35 40,20 50,25 C 60,30 70,15 85,25" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 5,50 C 25,50 35,40 50,50 C 65,60 75,50 95,50" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 15,75 C 30,65 40,80 50,75 C 60,70 70,85 85,75" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 25,15 C 35,30 20,40 25,50 C 30,60 15,70 25,85" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 50,5 C 50,25 40,35 50,50 C 60,65 40,75 50,95" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 75,15 C 65,30 80,40 75,50 C 70,60 85,70 75,85" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
        <path d="M 15,10 C 25,5 35,8 45,10 C 40,15 35,25 25,25 C 15,20 10,15 15,10 Z" fill="#e8ecef" stroke="#a2a9b1" stroke-width="1.5"/>
        <svg x="6" y="6" width="88" height="88" viewBox="-1000 -1000 14500 14500" preserveAspectRatio="xMidYMid meet">
          <g transform="translate(12500, 12000) scale(-1, -1)">
            <path d="M10630 11425 c-110 -31 -227 -113 -355 -246 -72 -76 -100 -110 -188 -231 -35 -48 -182 -165 -390 -312 l-169 -118 -81 21 c-448 112 -1127 54 -1968 -169 -1070 -284 -2300 -825 -2794 -1231 -38 -31 -131 -112 -205 -179 -442 -399 -518 -464 -713 -604 -344 -248 -755 -443 -1182 -560 -49 -13 -178 -41 -285 -61 -461 -85 -765 -170 -1120 -313 -432 -173 -1035 -513 -1111 -627 -84 -124 -87 -363 -7 -655 111 -407 391 -1007 791 -1695 964 -1657 2575 -3762 3298 -4309 156 -119 248 -153 324 -122 118 50 308 210 428 362 335 426 599 1162 743 2074 22 142 26 202 29 430 1 146 8 310 14 365 43 381 134 695 293 1010 78 154 107 197 307 445 287 359 591 776 881 1210 289 434 427 618 575 766 217 219 486 363 825 440 153 35 149 36 189 -43 42 -81 124 -185 187 -237 118 -98 294 -177 464 -207 36 -6 155 -12 265 -14 277 -4 482 -37 700 -112 325 -113 566 -305 687 -549 45 -92 76 -121 232 -228 264 -179 566 -238 747 -146 35 18 36 18 85 -6 195 -96 365 -7 449 235 14 39 25 76 25 83 0 6 18 39 40 72 52 82 104 196 132 292 29 103 31 285 4 384 -36 131 -70 183 -237 360 -407 432 -638 717 -810 1001 -138 229 -202 402 -245 663 -47 294 -80 359 -267 543 -133 130 -193 214 -255 361 -40 94 -44 111 -39 162 7 81 45 149 119 212 167 141 264 259 341 413 87 174 128 350 128 547 0 204 -37 298 -117 298 -47 0 -77 -31 -193 -196 -108 -153 -275 -320 -386 -386 -97 -58 -245 -115 -245 -94 0 25 47 139 114 276 95 193 175 454 176 568 0 37 -3 44 -27 53 -47 18 -144 20 -203 4z" fill="#002bb8"/>
          </g>
        </svg>
      </svg>
    </div>
    <div class="wiki-desktop-icon-text">Horsepedia</div>
  `;

  document.body.appendChild(wikiIcon);

  const launch = async () => {
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

  const makeIconDraggable = (icon, saveKey, clickCallback) => {
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, initialLeft, initialTop;

    const savedPos = JSON.parse(localStorage.getItem(saveKey));
    if (savedPos) {
      icon.style.left = savedPos.left;
      icon.style.top = savedPos.top;
      icon.style.right = "auto";
      icon.style.bottom = "auto";
    }

    icon.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      e.preventDefault();
      document.body.style.userSelect = "none";

      startX = e.clientX;
      startY = e.clientY;
      const rect = icon.getBoundingClientRect();
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
        }

        if (wasDragged) {
          icon.style.left = initialLeft + dx + "px";
          icon.style.top = initialTop + dy + "px";
          icon.style.right = "auto";
          icon.style.bottom = "auto";
        }
      };

      const onMouseUp = (upEvent) => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = "";

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        if (wasDragged) {
          const finalRect = icon.getBoundingClientRect();

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

          icon.style.left = relativePos.left;
          icon.style.top = relativePos.top;

          localStorage.setItem(saveKey, JSON.stringify(relativePos));
        } else {
          if (clickCallback) clickCallback(e);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  };

  makeIconDraggable(wikiIcon, "wiki_icon_pos", (e) => {
    e.stopPropagation();
    launch();
  });

  if (localStorage.getItem("wiki_is_open") === "true") {
    launch();
  }
}
