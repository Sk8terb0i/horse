export function createHorseSignaturesUI() {
  let signaturesMap = {};

  return {
    updateSignatures: (signatures) => {
      signaturesMap = signatures.reduce((acc, sig) => {
        if (!sig || !sig.username) return acc;
        const safeName = sig.username.trim().toLowerCase();
        if (!acc[safeName]) acc[safeName] = [];
        if (sig.drawing) acc[safeName].push(sig.drawing);
        return acc;
      }, {});
    },

    getRandomSignature: (username) => {
      if (!username) return null;
      const safeName = username.trim().toLowerCase();
      const userSigs = signaturesMap[safeName];
      if (!userSigs || userSigs.length === 0) return null;
      return userSigs[Math.floor(Math.random() * userSigs.length)];
    },

    // Added isCurrentUser flag for styling and hover events
    getSignatureHTML: (drawingUrl, isCurrentUser = false) => {
      if (!drawingUrl) return "";

      const cursorStyle = isCurrentUser ? "cursor: pointer;" : "";

      // Brighter white gradient so drawings don't vanish into the dark background
      return `
        <div class="aero-signature-container" style="
          width: 140px; height: 90px; 
          margin-bottom: 10px; 
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(230, 240, 255, 0.85) 100%); 
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 6px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 5px;
          pointer-events: auto; /* Crucial so it can be clicked */
          transition: transform 0.2s, filter 0.2s;
          ${cursorStyle}
        " 
        ${isCurrentUser ? 'title="Click to redraw your horse"' : ""}
        onmouseenter="if(${isCurrentUser}) { this.style.transform='scale(1.05) translateY(-2px)'; this.style.filter='brightness(1.1)'; }"
        onmouseleave="if(${isCurrentUser}) { this.style.transform='none'; this.style.filter='none'; }"
        >
          <img src="${drawingUrl}" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.15));" />
        </div>
      `;
    },
  };
}
