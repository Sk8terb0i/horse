import gsap from "gsap";

export function createXPLoader() {
  const xpStyle = document.createElement("style");
  xpStyle.innerHTML = `
    #xp-loader-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: black; z-index: 999999; display: none; flex-direction: column; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
    .xp-logo { color: #fff; font-family: 'Tahoma', sans-serif; font-size: 36px; font-weight: bold; font-style: italic; margin-bottom: 50px; text-shadow: 2px 2px 4px rgba(255,255,255,0.3); }
    .xp-bar-wrapper { width: 160px; height: 18px; border: 2px solid #b2b2b2; border-radius: 5px; background: #000; position: relative; overflow: hidden; }
    .xp-bar-squares { position: absolute; top: 2px; height: 10px; width: 35px; display: flex; gap: 2px; animation: xp-slide 1.5s infinite linear; }
    .xp-square { flex: 1; background: linear-gradient(to bottom, #2838c7 0%, #5979f2 50%, #2838c7 100%); border-radius: 1px; }
    @keyframes xp-slide { 0% { left: -40px; } 100% { left: 170px; } }
  `;
  document.head.appendChild(xpStyle);

  const xpLoader = document.createElement("div");
  xpLoader.id = "xp-loader-overlay";
  xpLoader.innerHTML = `<div class="xp-logo">galloping...</div><div class="xp-bar-wrapper"><div class="xp-bar-squares"><div class="xp-square"></div><div class="xp-square"></div><div class="xp-square"></div></div></div>`;
  document.body.appendChild(xpLoader);

  return {
    triggerLoad: (callback) => {
      xpLoader.style.display = "flex";
      xpLoader.style.opacity = "1";
      if (callback) callback();
      setTimeout(() => {
        gsap.to(xpLoader, {
          opacity: 0,
          duration: 0.4,
          onComplete: () => (xpLoader.style.display = "none"),
        });
      }, 1500);
    },
  };
}
