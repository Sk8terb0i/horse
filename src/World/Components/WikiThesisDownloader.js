import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

// Shared category map
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

// Baseline Lore for the Discernment Dashboard
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

const getCategoryIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("manifesto")) return "📜";
  if (lower.includes("apparatus")) return "🐬";
  if (lower.includes("essence")) return "🐎";
  if (lower.includes("solvent")) return "💉";
  if (lower.includes("literature") || lower.includes("reference")) return "📚";
  if (lower.includes("community")) return "👥";
  return "📁";
};

// Markdown Parser with strict Block-Level Break Avoidance
const parseMarkdownForPrint = (text) => {
  if (!text) return "";

  let parsed = text;

  // Convert Obsidian links globally first
  parsed = parsed.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, "");
    const parts = cleanInner.split("|");
    const displayText = (parts.length > 1 ? parts[1] : parts[0]).trim();
    return `<span class="print-wiki-link">${displayText}</span>`;
  });

  if (parsed.trim().startsWith('<div class="rich-text-content">'))
    return parsed;

  parsed = parsed
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  let inList = false,
    inOrderedList = false;

  parsed = parsed
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const isHeaderOrEmpty = trimmed === "" || trimmed.startsWith("<h");

      // Strict block wrapping prevents single-word orphans and keeps lists grouped
      if (trimmed.startsWith("- ")) {
        const item = `<li style="break-inside: avoid; page-break-inside: avoid;">${trimmed.substring(2)}</li>`;
        if (!inList) {
          inList = true;
          return `<ul style="margin-top: 4px; break-inside: avoid; page-break-inside: avoid; break-before: avoid; page-break-before: avoid;">${item}`;
        }
        return item;
      } else if (inList) {
        inList = false;
        line = `</ul>${line}`;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const item = `<li style="break-inside: avoid; page-break-inside: avoid; margin-top: 15px; font-weight: bold; font-size: 1.1em;">${trimmed.replace(/^\d+\.\s/, "")}</li>`;
        if (!inOrderedList) {
          inOrderedList = true;
          return `<ol style="margin-bottom: 0; break-after: avoid; page-break-after: avoid; break-inside: avoid; page-break-inside: avoid;">${item}`;
        }
        return item;
      } else if (inOrderedList) {
        inOrderedList = false;
        line = `</ol>${line}`;
      }

      // Wrap normal text in <p> to enforce unbreakable blocks
      return isHeaderOrEmpty
        ? line
        : `<p style="break-inside: avoid; page-break-inside: avoid; margin: 0 0 12px 0;">${line}</p>`;
    })
    .join("");

  if (inList) parsed += "</ul>";
  if (inOrderedList) parsed += "</ol>";
  return parsed;
};

// Horsepedia SVG Logo
const horsepediaLogo = `
  <svg viewBox="0 0 100 100" width="180" height="180">
    <circle cx="50" cy="50" r="45" fill="#f8f9fa" stroke="#a2a9b1" stroke-width="2"/>
    <path d="M 15,25 C 30,35 40,20 50,25 C 60,30 70,15 85,25" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 5,50 C 25,50 35,40 50,50 C 65,60 75,50 95,50" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 15,75 C 30,65 40,80 50,75 C 60,70 70,85 85,75" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 25,15 C 35,30 20,40 25,50 C 30,60 15,70 25,85" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 50,5 C 50,25 40,35 50,50 C 60,65 40,75 50,95" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 75,15 C 65,30 80,40 75,50 C 70,60 85,70 75,85" fill="none" stroke="#c8ccd1" stroke-width="1.5"/>
    <path d="M 15,10 C 25,5 35,8 45,10 C 40,15 35,25 25,25 C 15,20 10,15 15,10 Z" fill="#e8ecef" stroke="#a2a9b1" stroke-width="1.5"/>
    <svg x="6" y="6" width="88" height="88" viewBox="-1000 -1000 14500 14500" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(12500, 12000) scale(-1, -1)"><path d="M10630 11425 c-110 -31 -227 -113 -355 -246 -72 -76 -100 -110 -188 -231 -35 -48 -182 -165 -390 -312 l-169 -118 -81 21 c-448 112 -1127 54 -1968 -169 -1070 -284 -2300 -825 -2794 -1231 -38 -31 -131 -112 -205 -179 -442 -399 -518 -464 -713 -604 -344 -248 -755 -443 -1182 -560 -49 -13 -178 -41 -285 -61 -461 -85 -765 -170 -1120 -313 -432 -173 -1035 -513 -1111 -627 -84 -124 -87 -363 -7 -655 111 -407 391 -1007 791 -1695 964 -1657 2575 -3762 3298 -4309 156 -119 248 -153 324 -122 118 50 308 210 428 362 335 426 599 1162 743 2074 22 142 26 202 29 430 1 146 8 310 14 365 43 381 134 695 293 1010 78 154 107 197 307 445 287 359 591 776 881 1210 289 434 427 618 575 766 217 219 486 363 825 440 153 35 149 36 189 -43 42 -81 124 -185 187 -237 118 -98 294 -177 464 -207 36 -6 155 -12 265 -14 277 -4 482 -37 700 -112 325 -113 566 -305 687 -549 45 -92 76 -121 232 -228 264 -179 566 -238 747 -146 35 18 36 18 85 -6 195 -96 365 -7 449 235 14 39 25 76 25 83 0 6 18 39 40 72 52 82 104 196 132 292 29 103 31 285 4 384 -36 131 -70 183 -237 360 -407 432 -638 717 -810 1001 -138 229 -202 402 -245 663 -47 294 -80 359 -267 543 -133 130 -193 214 -255 361 -40 94 -44 111 -39 162 7 81 45 149 119 212 167 141 264 259 341 413 87 174 128 350 128 547 0 204 -37 298 -117 298 -47 0 -77 -31 -193 -196 -108 -153 -275 -320 -386 -386 -97 -58 -245 -115 -245 -94 0 25 47 139 114 276 95 193 175 454 176 568 0 37 -3 44 -27 53 -47 18 -144 20 -203 4z" fill="#002bb8"/></g>
    </svg>
  </svg>`;

export async function downloadThesisPDF(db) {
  const currentMonthYear = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const judgementsSnap = await getDocs(collection(db, "horse_judgement"));
  const liveJudgements = judgementsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  const articlesSnap = await getDocs(collection(db, "wiki_articles"));
  let articles = articlesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => a.section === "lore");

  const settingsSnap = await getDoc(doc(db, "wiki_settings", "category_order"));
  const categoryOrderArray = settingsSnap.exists()
    ? settingsSnap.data().order || []
    : [];

  const groupedArticles = {};
  articles.forEach((article) => {
    let rawCat = article.category;
    if (!rawCat) rawCat = categoryMap[article.title] || "04_Uncategorized";
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

  let tocHTML = `
    <div class="toc-page">
      <h2 class="toc-header">Herd Knowledge Base</h2>
      <div class="toc-sidebar-mock">
  `;
  let articlesHTML = ``;

  sortedCategories.forEach((rawCat) => {
    const displayName = rawCat
      .replace(/^\d{2}_/, "")
      .replace(/_/g, " ")
      .trim();
    const icon = getCategoryIcon(displayName);

    // Create an unbreakable column block for this specific category
    tocHTML += `
      <div class="toc-category-group">
        <div class="toc-category-header">
          <span>${icon}</span> <span>${displayName}</span>
        </div>
    `;

    const items = groupedArticles[rawCat].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });

    items.forEach((item) => {
      tocHTML += `<div class="toc-item">${item.title}</div>`;

      let contentHtml = item.content || "";

      // 1. AGGRESSIVE LINK PARSING
      contentHtml = contentHtml.replace(/\[\[(.*?)\]\]/g, (match, inner) => {
        const cleanInner = inner.replace(/<[^>]+>/g, "");
        const parts = cleanInner.split("|");
        const displayText = (parts.length > 1 ? parts[1] : parts[0]).trim();
        return `<span class="print-wiki-link">${displayText}</span>`;
      });

      if (item.title.toLowerCase() === "horse or not horse") {
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
          )
            merged.push(live);
        });

        const ongoingDebates = merged.filter((m) => m.status === "active");
        const horseConsensus = merged.filter(
          (m) => m.status === "settled" && m.verdict === "horse",
        );
        const notHorseConsensus = merged.filter(
          (m) => m.status === "settled" && m.verdict === "not horse",
        );

        // Create the Ongoing Debates HTML if there are any active votes
        let debatesHtml = "";
        if (ongoingDebates.length > 0) {
          debatesHtml = `
            <h3 style="color: #004b93; margin-top: 22px; border-bottom: 1px solid #aaaaaa; padding-bottom: 4px; font-weight: bold; font-size: 14pt; break-after: avoid; page-break-after: avoid;">⚡ Ongoing Debates</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 14px; margin: 12px 0 24px 0; width: 100%; box-sizing: border-box;">
              ${ongoingDebates
                .map((debate) => {
                  const h = debate.horseStomps || 0;
                  const nh = debate.notHorseStomps || 0;
                  const sum = h + nh;
                  const splitWidth = sum > 0 ? (h / sum) * 100 : 50;
                  return `
                  <div style="background: #f8f9fa; border: 1px solid #aaaaaa; padding: 12px 14px; border-radius: 4px; width: calc(50% - 7px); min-width: 250px; box-sizing: border-box; break-inside: avoid; page-break-inside: avoid;">
                    <div style="font-weight: bold; color: #000; margin-bottom: 6px; font-size: 12pt;">${debate.concept}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 4px; font-weight: bold;">
                      <span style="color: #558b2f;">horse (${h})</span>
                      <span style="color: #c62828;">not horse (${nh})</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #eaecf0; border-radius: 4px; overflow: hidden; display: flex; border: 1px solid #aaaaaa;">
                      <div style="width: ${splitWidth}%; height: 100%; background: #558b2f; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
                      <div style="width: ${100 - splitWidth}%; height: 100%; background: #c62828; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          `;
        }

        contentHtml = `
          <h2>Discernment Dashboard</h2>
          <p style="break-inside: avoid;">To participate in active sorting of things and beings into horse or not horse paths: Change the theme to <strong>"Lone"</strong>. Voting matters.</p>
          
          ${debatesHtml}

          <h3 style="break-after: avoid; page-break-after: avoid;">🐴 Verified Horse</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 24px; font-size: 11pt; border: 1px solid #aaaaaa; break-inside: auto; page-break-inside: auto;">
            <thead>
              <tr style="background-color: #f6f6f6; text-align: left; break-inside: avoid; page-break-inside: avoid;">
                <th style="padding: 10px; border: 1px solid #aaaaaa; color: #000; font-family: Arial, sans-serif;">Concept</th>
                <th style="padding: 10px; border: 1px solid #aaaaaa; color: #000; font-family: Arial, sans-serif;">Lore Connection Alignment</th>
              </tr>
            </thead>
            <tbody>
              ${horseConsensus
                .map(
                  (c) => `
                <tr style="break-inside: avoid; page-break-inside: avoid;">
                  <td style="padding: 10px; border: 1px solid #aaaaaa; font-weight: bold; color: #002bb8;">${c.concept}</td>
                  <td style="padding: 10px; border: 1px solid #aaaaaa;">${c.description || "aligned frequency validated by matching impacts."}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <h3 style="break-after: avoid; page-break-after: avoid;">❌ Confirmed NotHorse Divergences</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; border: 1px solid #aaaaaa; break-inside: auto; page-break-inside: auto;">
            <thead>
              <tr style="background-color: #f6f6f6; text-align: left; break-inside: avoid; page-break-inside: avoid;">
                <th style="padding: 10px; border: 1px solid #aaaaaa; color: #000; font-family: Arial, sans-serif;">Concept</th>
                <th style="padding: 10px; border: 1px solid #aaaaaa; color: #000; font-family: Arial, sans-serif;">Divergence Vector Details</th>
              </tr>
            </thead>
            <tbody>
              ${notHorseConsensus
                .map(
                  (c) => `
                <tr style="break-inside: avoid; page-break-inside: avoid;">
                  <td style="padding: 10px; border: 1px solid #aaaaaa; font-weight: bold; color: #b30000;">${c.concept}</td>
                  <td style="padding: 10px; border: 1px solid #aaaaaa;">${c.description || "frequency isolated from universal essence."}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
      }
      // 2. Convert rich-text saved obsidian links
      else if (contentHtml.includes('class="obsidian-link"')) {
        contentHtml = contentHtml.replace(
          /class="obsidian-link"/g,
          'class="print-wiki-link"',
        );
      }
      // 3. Fallback pure markdown parse
      else if (
        !contentHtml.trim().startsWith('<div class="rich-text-content">')
      ) {
        contentHtml = parseMarkdownForPrint(contentHtml);
      }

      // 4. Clean up any remaining references
      let referencesHtml = item.references || "";
      if (referencesHtml) {
        referencesHtml = referencesHtml.replace(
          /\[\[(.*?)\]\]/g,
          (match, inner) => {
            const cleanInner = inner.replace(/<[^>]+>/g, "");
            const parts = cleanInner.split("|");
            return `<span class="print-wiki-link">${(parts[1] || parts[0]).trim()}</span>`;
          },
        );
        referencesHtml = parseMarkdownForPrint(referencesHtml);
      }

      articlesHTML += `
        <div class="article-page">
          <h1 class="article-title">${item.title}</h1>
          <div class="article-meta">By: <strong>${item.author || "Unknown"}</strong> | Section: <span>${item.section}</span></div>
          <div class="article-content">${contentHtml}</div>
          ${referencesHtml ? `<div class="article-references"><h3>References</h3>${referencesHtml}</div>` : ""}
        </div>
      `;
    });

    // Close category group block
    tocHTML += `</div>`;
  });
  tocHTML += `</div></div>`;

  // Create a hidden iframe
  const iframe = document.createElement("iframe");

  // Visually hide the iframe, but avoid `display: none`
  // as some browsers won't print elements with display:none correctly
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow.document;

  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>dolphins shouldn't exist - Noe Mael Arnold</title>
      <style>
        /* CORE RESET FOR PRINTING */
        html, body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
          line-height: 1.5;
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important;
        }

        /* PAGE SETTINGS - STRICT A4 */
        @page { 
          size: A4 portrait; 
          margin: 15mm 20mm; 
        }

        /* DUPLEX BREAK RULES */
        .cover-page { 
          break-after: page; 
          page-break-after: always; 
        }
        .toc-page { 
          break-before: right; 
          page-break-before: right; 
          break-after: page; 
          page-break-after: always; 
        }
        .article-page { 
          break-before: right; 
          page-break-before: right;
        }

        /* STRICT ANTI-ORPHAN/WIDOW RULES */
        h1, h2, h3, h4, h5, h6, .article-title {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        
        /* Force blocks to jump entirely to the next page instead of splitting */
        p, li, td, th, img, figure, .reference-card, .toc-category-group {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* COVER PAGE */
        .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; }
        .cover-border { border: 1px solid #aaaaaa; padding: 60px 40px; width: 80%; max-width: 600px; box-shadow: inset 0 0 0 4px #f6f6f6; }
        .cover-logo { margin-bottom: 40px; }
        .cover-title { font-family: "Times New Roman", Times, serif; font-size: 32pt; font-weight: normal; margin: 0 0 10px 0; border-bottom: 1px solid #aaaaaa; padding-bottom: 10px; }
        .cover-subtitle { font-family: "Times New Roman", Times, serif; font-size: 18pt; font-style: italic; color: #000; margin: 0 0 50px 0; }
        .cover-author { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
        .cover-date { font-size: 12pt; color: #444; margin-bottom: 30px; }
        .cover-thesis { font-size: 10pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }

        /* ONE-COLUMN TOC STYLES */
        .toc-header { font-family: "Times New Roman", Times, serif; font-size: 24pt; color: #000; border-bottom: 1px solid #aaaaaa; padding-bottom: 10px; margin-bottom: 20px; font-weight: normal; }
        .toc-sidebar-mock { 
          background-color: #f6f6f6; 
          padding: 15px 20px; 
          border: 1px solid #aaaaaa;
          font-size: 10pt; 
        }
        .toc-category-group {
          margin-bottom: 12px; 
          break-inside: avoid; 
          page-break-inside: avoid;
        }
        .toc-category-header { padding: 0 0 4px 0; color: #444; font-size: 11pt; border-bottom: 1px solid #aaaaaa; margin-bottom: 4px; text-transform: lowercase; display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .toc-item { padding: 2px 0 2px 10px; color: #002bb8; font-size: 10pt; cursor: default; }

        /* ARTICLE STYLES */
        .article-title { font-family: "Times New Roman", Times, serif; font-size: 30pt; border-bottom: 1px solid #aaaaaa; padding-bottom: 2px; margin-bottom: 5px; font-weight: normal; color: #000; }
        .article-meta { font-size: 11pt; color: #666; margin-bottom: 15px; }
        .article-content { font-size: 11pt; color: #000; display: block; }
        .article-content h2 { font-family: "Times New Roman", Times, serif; font-size: 20pt; color: #000; border-bottom: 1px solid #aaaaaa; padding-bottom: 0.1em; margin-top: 1.2em; margin-bottom: 0.5em; font-weight: normal; }
        .article-content h3 { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; color: #000; font-weight: bold; margin-top: 1em; margin-bottom: 0.4em; }
        .article-content img { max-width: 100%; height: auto; border: 1px solid #ccc; padding: 3px; background: #fff; margin: 10px 0; display: block; }
        
        /* EXACT BLUE FOR LINKS */
        .print-wiki-link, .print-wiki-link * { 
          color: #002bb8 !important; 
          text-decoration: none !important; 
          font-weight: normal !important; 
        }
        
        .article-references { margin-top: 30px; border-top: 1px solid #aaaaaa; padding-top: 15px; font-size: 9pt; line-height: 1.4; }
        .article-references h3 { font-size: 10pt; margin-bottom: 5px; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="cover-page">
        <div class="cover-border">
          <div class="cover-logo">${horsepediaLogo}</div>
          <h1 class="cover-title">dolphins shouldn't exist</h1>
          <h2 class="cover-subtitle">Horse; a way of life.</h2>
          <div class="cover-author">noe mael arnold</div>
          <div class="cover-date">${currentMonthYear}</div>
          <div class="cover-thesis">MA transdisciplinary studies thesis</div>
        </div>
      </div>

      ${tocHTML}
      ${articlesHTML}
      
      <script>
        window.onload = () => {
          setTimeout(() => {
            // 1. Save your main website's current title
            const originalTitle = window.parent.document.title;
            
            // 2. Temporarily change the main title to your desired PDF file name
            window.parent.document.title = "dolphins shouldn't exist - Noe Mael Arnold";
            
            // 3. Focus and trigger the print dialog
            window.focus(); 
            window.print(); 
            
            // 4. Instantly restore your website's original title
            window.parent.document.title = originalTitle;
            
            // Optional cleanup: remove the iframe from the DOM 
            setTimeout(() => {
              if (window.frameElement) {
                window.parent.document.body.removeChild(window.frameElement);
              }
            }, 1000);
          }, 1000);
        };
      </script>
    </body>
    </html>
  `);

  iframeDoc.close();
}
