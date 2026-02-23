export function createAudioManager() {
  const hoofbeatPaths = [
    "/assets/hoofbeat1.wav",
    "/assets/hoofbeat2.wav",
    "/assets/hoofbeat3.wav",
    "/assets/hoofbeat4.wav",
    "/assets/hoofbeat5.wav",
  ];

  const hoofbeatAudios = hoofbeatPaths.map((path) => {
    const audio = new Audio(path);
    audio.volume = 0.05;
    return audio;
  });

  let lastSoundIndex = -1;
  let startX = 0;
  let startY = 0;

  const playRandomHoofbeat = () => {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * hoofbeatAudios.length);
    } while (randomIndex === lastSoundIndex);

    lastSoundIndex = randomIndex;
    const selectedAudio = hoofbeatAudios[randomIndex];
    selectedAudio.currentTime = 0;
    selectedAudio.play().catch(() => {});
  };

  // track start position
  document.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
  });

  // only play on mouseup if the mouse hasn't moved (prevents drag sounds)
  document.addEventListener("mouseup", (e) => {
    const diffX = Math.abs(e.clientX - startX);
    const diffY = Math.abs(e.clientY - startY);

    // threshold of 5 pixels to define a "click" vs "drag"
    if (diffX < 5 && diffY < 5) {
      playRandomHoofbeat();
    }
  });

  return {
    play: playRandomHoofbeat,
  };
}
