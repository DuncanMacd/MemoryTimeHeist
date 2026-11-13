(() => {
  "use strict";

  const button = document.getElementById("sound");
  const status = document.getElementById("audio-status");
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const eighth = 0.19;
  // Sixteen bars from "The Cortege" followed by a four-bar returning bridge.
  // Each bar has six eighth notes; entries are offset, MIDI note and duration.
  const bars = [
    [[2, 62, 1], [3, 62, 1], [4, 61, 1], [5, 59, 1]],
    [[0, 61, 1], [2, 62, 1], [3, 64, 1]],
    [[2, 62, 1], [3, 62, 1], [4, 61, 1], [5, 59, 1]],
    [[0, 61, 1], [2, 62, 1], [3, 64, 1]],
    [[2, 65, 1], [3, 69, 2], [5, 67, 1]],
    [[0, 65, 1], [2, 69, 1], [3, 71, 2], [5, 69, 1]],
    [[0, 67, 1], [2, 71, 1], [3, 74, 2], [5, 72, 1]],
    [[0, 71, 1], [1, 70, 1], [2, 69, 1], [3, 67, 1], [4, 65, 1], [5, 64, 1]],
    [[2, 62, 1], [3, 62, 1], [4, 61, 1], [5, 59, 1]],
    [[0, 61, 1], [2, 62, 1], [3, 64, 1]],
    [[2, 62, 1], [3, 69, 3]],
    [[0, 69, 3], [3, 67, 3]],
    [[0, 64, 1], [2, 67, 1], [3, 71, 2], [5, 69, 1]],
    [[0, 69, 1], [1, 67, 1], [2, 65, 1], [3, 63, 1], [4, 67, 1], [5, 70, 1]],
    [[0, 62, 1], [1, 61, 1], [2, 62, 1], [3, 64, 1], [5, 65, 1]],
    [[0, 64, 3], [3, 62, 1]],
    [[0, 62, 2], [2, 65, 1], [3, 69, 2], [5, 65, 1]],
    [[0, 67, 2], [2, 65, 1], [3, 64, 2], [5, 61, 1]],
    [[0, 69, 2], [2, 73, 1], [3, 76, 2], [5, 73, 1]],
    [[0, 67, 2], [2, 64, 1], [3, 61, 3]]
  ];
  const bassNotes = [
    [38, 50], [45, 45], [38, 50], [45, 45],
    [38, 50], [43, 55], [36, 48], [45, 45],
    [38, 50], [45, 45], [38, 50], [45, 45],
    [38, 50], [43, 55], [45, 45], [38, 50],
    [38, 50], [43, 43], [45, 45], [45, 45]
  ];
  const loopDuration = bars.length * 6 * eighth;
  let context = null;
  let enabled = false;
  let musicActive = true;
  let searchActive = false;
  let timer = null;
  let nextLoop = 0;
  let searchTimer = null;
  const voices = new Set();
  let generation = 0;

  function tone(note, start, duration, volume, type = "square", group = "other") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.setValueAtTime(volume, start + duration - 0.015);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    const voice = { oscillator, gain, group };
    voices.add(voice);
    oscillator.onended = () => {
      voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function stopVoices(group) {
    for (const voice of voices) {
      if (group && voice.group !== group) continue;
      voice.oscillator.onended = null;
      voice.oscillator.stop();
      voice.oscillator.disconnect();
      voice.gain.disconnect();
      voices.delete(voice);
    }
  }

  function stopTimers() {
    if (timer !== null) clearInterval(timer);
    if (searchTimer !== null) clearInterval(searchTimer);
    timer = null;
    searchTimer = null;
    stopVoices();
  }

  function scheduleMusic() {
    while (nextLoop < context.currentTime + 0.25) {
      for (let bar = 0; bar < bars.length; bar++) {
        const start = nextLoop + bar * 6 * eighth;
        for (const [beat, note, duration] of bars[bar]) {
          tone(note, start + beat * eighth, duration * eighth * 0.8, 0.045);
        }
        for (let beat = 0; beat < 2; beat++) {
          tone(bassNotes[bar][beat], start + beat * 3 * eighth, eighth * 0.8, 0.025, "triangle");
        }
      }
      nextLoop += loopDuration;
    }
  }

  function searchTick() {
    tone(76, context.currentTime, 0.045, 0.022, "square", "search");
  }

  function refreshPlayback() {
    stopTimers();
    if (!enabled || document.hidden || !context || context.state !== "running") return;
    if (musicActive) {
      nextLoop = context.currentTime + 0.03;
      scheduleMusic();
      timer = setInterval(scheduleMusic, 100);
    }
    if (searchActive) {
      searchTick();
      searchTimer = setInterval(searchTick, 220);
    }
  }

  function setEnabled(value) {
    enabled = value;
    button.textContent = value ? "MUTE SOUND" : "ENABLE SOUND";
    button.setAttribute("aria-pressed", String(value));
  }

  async function resume() {
    const request = ++generation;
    try {
      await context.resume();
      if (request !== generation || !enabled || document.hidden) return;
      if (context.state !== "running") throw new Error("Audio context did not start.");
      status.textContent = "";
      refreshPlayback();
    } catch (error) {
      if (request !== generation) return;
      setEnabled(false);
      stopTimers();
      status.textContent = "Sound could not start. Please try enabling it again.";
      console.error("Could not start game audio:", error);
    }
  }

  button.addEventListener("click", () => {
    if (enabled) {
      ++generation;
      setEnabled(false);
      stopTimers();
      status.textContent = "";
      return;
    }
    if (!AudioContext) {
      status.textContent = "Sound is not supported by this browser.";
      console.error("Web Audio is not supported by this browser.");
      return;
    }
    try {
      if (!context) context = new AudioContext();
      setEnabled(true);
      resume();
    } catch (error) {
      setEnabled(false);
      status.textContent = "Sound could not start. Please try enabling it again.";
      console.error("Could not initialize game audio:", error);
    }
  });

  document.addEventListener("visibilitychange", () => {
    ++generation;
    if (document.hidden) stopTimers();
    else if (enabled) resume();
  });

  window.gameAudio = {
    setMusicActive(active) {
      if (musicActive === active) return;
      musicActive = active;
      refreshPlayback();
    },
    setSearching(active) {
      if (searchActive === active) return;
      searchActive = active;
      if (searchTimer !== null) clearInterval(searchTimer);
      searchTimer = null;
      if (!active) stopVoices("search");
      if (active && enabled && !document.hidden && context && context.state === "running") {
        searchTick();
        searchTimer = setInterval(searchTick, 220);
      }
    },
    alert() {
      if (!enabled || document.hidden || !context || context.state !== "running") return;
      const start = context.currentTime;
      tone(81, start, 0.1, 0.05);
      tone(88, start + 0.12, 0.18, 0.05);
    }
  };
})();
