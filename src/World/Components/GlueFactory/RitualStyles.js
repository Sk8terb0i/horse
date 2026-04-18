export const RitualStyles = `
  #glue-factory-root {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: #008080;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;
  }

  .game-wrapper {
    position: relative;
    background: #c0c0c0;
    padding: 3px;
    border: 2px outset #fff;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
    height: 85vh; 
    width: calc(85vh * (1800 / 1126));
    max-width: 95vw;
    max-height: calc(95vw * (1126 / 1800));
  }

  .viewport-area {
    width: 100%; height: 100%;
    background-size: 100% 100%; 
    background-position: center;
    position: relative;
    overflow: hidden;
    border: 2px inset #fff;
    cursor: default;
  }

  /* SIDEBAR OVERLAY */
  .win95-window-sidebar {
    position: absolute;
    top: 5px; left: 5px;
    width: 260px;
    height: calc(100% - 10px);
    display: flex;
    flex-direction: column;
    background: #c0c0c0;
    border: 2px outset #fff;
    z-index: 50; 
    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
  }

  .catalog-sidebar {
    flex: 1;
    overflow-y: scroll;
    background: #fff;
    border: 2px inset #fff;
    margin: 2px; padding: 5px;
  }

  .win95-title {
    background: linear-gradient(90deg, #000080, #1084d0);
    color: white;
    padding: 3px 5px;
    font-weight: bold;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
  }

  .btn-95 {
    padding: 6px;
    border: 2px outset #fff;
    background: #c0c0c0;
    cursor: pointer;
    font-size: 11px;
    color: #000;
    font-family: "MS Sans Serif", Arial, sans-serif;
  }
  .btn-95:active { border: 2px inset #fff; }

  .catalog-category h4 {
    margin: 10px 0 4px 0;
    font-size: 11px;
    background: #000080;
    color: white;
    padding: 2px 5px;
  }

  .catalog-item {
    width: 58px; height: 58px;
    object-fit: contain;
    border: 1px solid #ccc;
    margin: 2px;
    background: #eee;
    cursor: grab;
  }

  /* FIXED MODAL POSITIONING: Now centers inside the Game Wrapper */
  .modal-overlay {
    position: absolute; /* Changed from fixed */
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 20000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .win95-dialog {
    background: #c0c0c0;
    border: 2px outset #fff;
    padding: 2px;
    min-width: 300px;
    box-shadow: 4px 4px 20px rgba(0,0,0,0.5);
  }

  .win95-input {
    width: 100%; padding: 6px; margin: 10px 0;
    border: 2px inset #fff; background: #fff; color: #000;
    box-sizing: border-box; font-family: "MS Sans Serif", Arial, sans-serif;
  }

  .manifestation-name-box {
    border: 2px inset #fff; padding: 10px; background: #fff; cursor: grab; text-align: center; font-weight: bold; font-size: 12px; margin: 2px; color: #000;
  }

  .sprite-part { position: absolute; transform-origin: center center; user-select: none; }
  .active-part { outline: 2px dashed #ff0000; }
  .floating-tools { position: absolute; display: none; z-index: 10000; transform: translate(-50%, -50%); pointer-events: none; }
  
  .tool-handle {
    position: absolute; width: 30px; height: 30px;
    background: #c0c0c0; border: 2px outset #fff;
    display: flex; justify-content: center; align-items: center;
    font-size: 16px; pointer-events: auto; transform: translate(-50%, -50%);
  }

  .group-stack {
    position: absolute; top: 0%; left: 0%;
    transform: translate(-50%, -50%);
    display: flex; flex-direction: column; gap: 2px;
  }
  .group-stack .tool-handle { position: static; transform: none; }

  #handle-scale { top: 100%; left: 100%; cursor: nwse-resize; }
  #handle-rotate { top: 100%; left: 0%; border-radius: 50%; background: #ffdb58; border: 2px solid #000; cursor: crosshair; }
  #handle-delete { top: 0%; left: 100%; color: #800000; background: #ffcccc; }

  /* BOILING ANIMATIONS */
  .pot-static { position: absolute; pointer-events: none; max-width: none; transform: translate(-50%, -50%); }
  .boil-part-sprite { position: absolute; pointer-events: none; max-width: none; transform-origin: center center; }

  @keyframes bob {
    0%, 100% { margin-top: -2%; }
    50% { margin-top: 2%; }
  }
  .bobbing { animation: bob 3s ease-in-out infinite; }

  .bubble {
    position: absolute; pointer-events: none; z-index: 35; 
    transform: translate(-50%, -50%); animation: pop 0.6s ease-out forwards;
  }
  @keyframes pop {
    0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translate(-50%, -100%) scale(1.2); opacity: 0; }
  }

  .steam {
    position: absolute; pointer-events: none; z-index: 110; opacity: 0;
    animation: rise 4s ease-out forwards;
  }
  @keyframes rise {
    0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
    20% { opacity: 0.3; }
    100% { transform: translate(-50%, -250px) scale(2.5); opacity: 0; }
  }

  .floating-thought {
    position: absolute;
    pointer-events: none;
    z-index: 150;
    font-family: "MS Sans Serif", Arial, sans-serif;
    font-size: 10px;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 1px 1px 2px #000;
    white-space: nowrap;
    animation: floatText 5s linear forwards;
  }
  @keyframes floatText {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100px); opacity: 0; }
  }
`;
