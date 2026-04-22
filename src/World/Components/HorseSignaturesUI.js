export function createHorseSignaturesUI() {
  let signaturesMap = {}; // username -> array of drawings

  return {
    updateSignatures: (signatures) => {
      // Group signatures by username
      signaturesMap = signatures.reduce((acc, sig) => {
        if (!acc[sig.username]) acc[sig.username] = [];
        acc[sig.username].push(sig.drawing);
        return acc;
      }, {});
    },

    getRandomSignature: (username) => {
      const userSigs = signaturesMap[username];
      if (!userSigs || userSigs.length === 0) return null;
      return userSigs[Math.floor(Math.random() * userSigs.length)];
    },

    // Returns the Vista/Aero styled HTML string for the signature container
    getSignatureHTML: (drawingUrl) => {
      if (!drawingUrl) return "";
      return `
        <div class="aero-signature-container" style="
          width: 100px; height: 65px; 
          margin-bottom: 8px; 
          background: rgba(255, 255, 255, 0.2); 
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 4px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 0 10px rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          transition: transform 0.3s ease;
        ">
          <img src="${drawingUrl}" style="max-width: 90%; max-height: 90%; object-fit: contain; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));" />
        </div>
      `;
    },
  };
}
