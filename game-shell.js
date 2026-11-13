(() => {
  "use strict";

  const titleScreen = document.getElementById("title-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameActions = document.getElementById("game-actions");
  const subtitle = document.getElementById("subtitle");
  const start = document.getElementById("start");
  const menu = document.getElementById("menu");
  const restart = document.getElementById("restart");
  const levelCompleteScreen = document.getElementById("level-complete-screen");
  const levelCompleteSummary = document.getElementById("level-complete-summary");
  const aiDialogueText = document.getElementById("ai-dialogue-text");
  const aiDialogueAnnouncement = document.getElementById("ai-dialogue-announcement");
  const aiDialogue = document.querySelector(".ai-dialogue");
  const nextLevelDetails = document.getElementById("next-level-details");
  const nextLevelSummary = document.getElementById("next-level-summary");
  const nextLevelButton = document.getElementById("next-level");
  const levelCompleteTitle = document.getElementById("level-complete-title");
  const gameOverScreen = document.getElementById("game-over-screen");
  const gameOverTitle = document.getElementById("game-over-title");
  const gameOverReason = document.getElementById("game-over-reason");
  const gameOverMessage = document.getElementById("game-over-message");
  const levelLabel = document.getElementById("level-label");
  const timer = document.getElementById("timer");
  const memoryTotal = document.getElementById("memory-total");
  const memoryProgress = document.getElementById("memory-progress");
  const memoryMessage = document.getElementById("memory-message");

  function isPowerOfTwo(value) {
    return Number.isSafeInteger(value) && value > 0 &&
      2 ** Math.round(Math.log2(value)) === value;
  }

  if (typeof LEVEL_DATA === "undefined" || !Array.isArray(LEVEL_DATA) || LEVEL_DATA.length !== 5 ||
      LEVEL_DATA.some(level => !level || !Number.isFinite(level.seconds) || level.seconds <= 0 ||
        !Number.isSafeInteger(level.targetMB) || level.targetMB <= 0 ||
        !level.memoryRange || !isPowerOfTwo(level.memoryRange.minMB) ||
        !isPowerOfTwo(level.memoryRange.maxMB) || level.memoryRange.minMB > level.memoryRange.maxMB ||
        !Number.isInteger(level.guardCount) || level.guardCount < 0 || level.guardCount > 4 ||
        !["route", "observant", "fullforce"].includes(level.guardBehaviour) ||
        !level.guardSpeed || !Number.isFinite(level.guardSpeed.normal) || level.guardSpeed.normal <= 0 ||
        !Number.isFinite(level.guardSpeed.burst) || level.guardSpeed.burst < level.guardSpeed.normal ||
        !Number.isFinite(level.guardSpeed.burstSeconds) || level.guardSpeed.burstSeconds < 0 ||
        !level.guardArrival || !Number.isFinite(level.guardArrival.initialDelay) || level.guardArrival.initialDelay < 0 ||
        !Number.isFinite(level.guardArrival.interval) || level.guardArrival.interval < 0)) {
    const message = "Invalid level-data.js: provide five levels with positive seconds and targetMB, an ordered power-of-two memoryRange, guardCount from 0 to 4, valid guardBehaviour, positive guardSpeed normal, burst at least normal, non-negative burstSeconds, and non-negative guardArrival timings.";
    document.getElementById("title-screen").hidden = true;
    gameOverReason.textContent = "CONFIGURATION ERROR";
    gameOverMessage.textContent = message;
    gameOverTitle.hidden = true;
    gameOverScreen.hidden = false;
    console.error(message);
    throw new Error(message);
  }
  const levels = LEVEL_DATA.map(level => ({
    ...level, id: "computer-shop", title: "Computer Shop", controller: window.shopLevel
  }));
  let currentLevel = null;
  let levelNumber = 1;
  let remaining = 0;
  let clockStartedAt = null;
  let paused = false;
  let memoryMB = 0;
  let cutsceneTimer = null;

  function clearCutscene() {
    if (cutsceneTimer !== null) clearTimeout(cutsceneTimer);
    cutsceneTimer = null;
    aiDialogue.classList.remove("speaking");
  }

  function showDialogue(message, duration, next) {
    const words = message.split(" ");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reducedMotion ? 0 : 160;
    let count = 0;
    aiDialogueText.textContent = "";
    aiDialogueAnnouncement.textContent = "";
    aiDialogue.classList.toggle("speaking", !reducedMotion);

    function reveal() {
      count = interval ? count + 1 : words.length;
      aiDialogueText.textContent = words.slice(0, count).join(" ");
      if (count < words.length) {
        cutsceneTimer = setTimeout(reveal, interval);
      } else {
        aiDialogue.classList.remove("speaking");
        aiDialogueAnnouncement.textContent = message;
        const revealDuration = interval * (words.length - 1);
        cutsceneTimer = setTimeout(next, Math.max(1000, duration - revealDuration));
      }
    }
    reveal();
  }

  function startCutscene(looping) {
    clearCutscene();
    nextLevelDetails.hidden = true;
    levelCompleteTitle.hidden = !looping;
    showDialogue("Attempting to plot our way back to our time...", 3000, () => {
      showDialogue(looping ? "Succeeded!" : "Failed, we need more memory.", 2000, () => {
        if (looping) {
          showDialogue("Oh. Probably shouldn't have let me watch Time Tunnel before we set off", 2000, () => {
            nextLevelDetails.hidden = false;
            cutsceneTimer = null;
          });
        } else {
          nextLevelDetails.hidden = false;
          cutsceneTimer = null;
        }
      });
    });
  }

  function renderMemory(message) {
    memoryTotal.textContent = `${memoryMB} / ${currentLevel.targetMB} MB`;
    memoryProgress.max = currentLevel.targetMB;
    memoryProgress.value = Math.min(memoryMB, currentLevel.targetMB);
    memoryProgress.classList.toggle("target-met", memoryMB >= currentLevel.targetMB);
    memoryMessage.textContent = message;
  }

  function renderClock() {
    const seconds = Math.ceil(remaining);
    timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    timer.classList.toggle("urgent", seconds <= 10);
  }

  function gameOver(caught = false) {
    currentLevel.controller.leave();
    window.gameAudio.setMusicActive(false);
    currentLevel = null;
    paused = false;
    clockStartedAt = null;
    gameScreen.hidden = true;
    gameActions.hidden = true;
    gameOverScreen.hidden = false;
    gameOverReason.textContent = caught ? "CAUGHT" : "TIME'S UP";
    gameOverMessage.textContent = caught ? "You got caught." : "You didn't reach the front doors in time.";
    subtitle.textContent = `Level ${levelNumber} — Computer Shop`;
    document.getElementById("game-over-heading").focus();
  }

  function updateClock(now) {
    if (!currentLevel || paused || document.hidden || !currentLevel.controller || !currentLevel.controller.ready) {
      clockStartedAt = null;
      return;
    }
    if (clockStartedAt !== null) remaining = Math.max(0, remaining - (now - clockStartedAt) / 1000);
    clockStartedAt = now;
    renderClock();
    if (remaining <= 0) gameOver();
  }

  function tick(now) {
    updateClock(now);
    requestAnimationFrame(tick);
  }

  function resetLevel() {
    currentLevel.controller.reset(currentLevel);
    remaining = currentLevel.seconds;
    memoryMB = 0;
    clockStartedAt = null;
    renderClock();
    renderMemory("Find memory, then reach the front doors.");
  }

  function searchComplete(foundMB) {
    updateClock(performance.now());
    if (!currentLevel) return false;
    memoryMB += foundMB;
    const message = memoryMB >= currentLevel.targetMB
      ? `Found ${foundMB} MB. Target met — get to the front doors!`
      : `Found ${foundMB} MB. Keep searching!`;
    renderMemory(message);
    return true;
  }

  function caughtByGuard() {
    updateClock(performance.now());
    if (!currentLevel) return;
    currentLevel.controller.freezeCaught();
    paused = true;
    clockStartedAt = null;
    gameActions.hidden = true;
    setTimeout(() => gameOver(true), 1000);
  }

  function exitLevel() {
    updateClock(performance.now());
    if (!currentLevel) return;
    if (memoryMB < currentLevel.targetMB) {
      renderMemory(`Exit locked. Collect ${currentLevel.targetMB - memoryMB} more MB.`);
      return;
    }
    currentLevel.controller.leave();
    window.gameAudio.setMusicActive(false);
    const looping = levelNumber === levels.length;
    const nextLevelNumber = looping ? 1 : levelNumber + 1;
    const nextLevel = levels[nextLevelNumber - 1];
    levelCompleteSummary.textContent = `Level ${levelNumber} complete. You collected ${memoryMB} MB.`;
    nextLevelSummary.textContent = `Level ${nextLevelNumber}: collect ${nextLevel.targetMB} MB in ${nextLevel.seconds} seconds.`;
    currentLevel = null;
    clockStartedAt = null;
    gameScreen.hidden = true;
    gameActions.hidden = true;
    levelCompleteScreen.hidden = false;
    document.getElementById("level-complete-heading").focus();
    startCutscene(looping);
  }

  function enterLevel(level, resume) {
    clearCutscene();
    window.gameAudio.setMusicActive(true);
    titleScreen.hidden = true;
    levelCompleteScreen.hidden = true;
    gameOverScreen.hidden = true;
    gameScreen.hidden = false;
    gameActions.hidden = false;
    currentLevel = level;
    paused = false;
    clockStartedAt = null;
    levelLabel.textContent = `LEVEL ${levelNumber}`;
    subtitle.textContent = `Level ${levelNumber} — ${level.title}`;
    if (level.controller) {
      if (!resume) resetLevel();
      level.controller.enter(exitLevel, searchComplete, caughtByGuard);
    } else {
      const loading = document.getElementById("loading");
      if (loading.textContent === "LOADING SHOP...") {
        loading.textContent = "THE COMPUTER SHOP COULD NOT BE INITIALIZED. PLEASE RELOAD THE PAGE.";
        document.getElementById("status").textContent = "THE SHOP COULD NOT BE INITIALIZED";
        console.error("Computer shop level controller is unavailable.");
      }
    }
  }

  function showTitle() {
    clearCutscene();
    if (currentLevel) {
      updateClock(performance.now());
      if (!currentLevel) return;
      currentLevel.controller.leave();
      paused = true;
    }
    clockStartedAt = null;
    gameScreen.hidden = true;
    gameActions.hidden = true;
    gameOverScreen.hidden = true;
    levelCompleteScreen.hidden = true;
    titleScreen.hidden = false;
    window.gameAudio.setMusicActive(true);
    subtitle.textContent = "A journey through the computer age.";
    start.focus();
  }

  start.addEventListener("click", () => {
    const resume = paused && currentLevel;
    if (!resume) levelNumber = 1;
    enterLevel(resume ? currentLevel : levels[0], Boolean(resume));
  });
  menu.addEventListener("click", showTitle);
  nextLevelButton.addEventListener("click", () => {
    levelNumber = levelNumber % levels.length + 1;
    enterLevel(levels[levelNumber - 1], false);
  });
  levelCompleteTitle.addEventListener("click", showTitle);
  gameOverTitle.addEventListener("click", showTitle);
  restart.addEventListener("click", () => {
    updateClock(performance.now());
    if (!currentLevel) return;
    resetLevel();
    currentLevel.controller.enter(exitLevel, searchComplete, caughtByGuard);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && currentLevel && !paused && clockStartedAt !== null) {
      remaining = Math.max(0, remaining - (performance.now() - clockStartedAt) / 1000);
      renderClock();
      if (remaining <= 0) gameOver();
    }
    clockStartedAt = null;
  });
  requestAnimationFrame(tick);
})();
