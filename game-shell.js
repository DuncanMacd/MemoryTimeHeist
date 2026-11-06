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
  const nextLevelDetails = document.getElementById("next-level-details");
  const nextLevelSummary = document.getElementById("next-level-summary");
  const nextLevelButton = document.getElementById("next-level");
  const gameOverScreen = document.getElementById("game-over-screen");
  const gameOverTitle = document.getElementById("game-over-title");
  const gameOverReason = document.getElementById("game-over-reason");
  const gameOverMessage = document.getElementById("game-over-message");
  const levelLabel = document.getElementById("level-label");
  const timer = document.getElementById("timer");
  const memoryTotal = document.getElementById("memory-total");
  const memoryProgress = document.getElementById("memory-progress");
  const memoryMessage = document.getElementById("memory-message");

  if (typeof LEVEL_DATA === "undefined" || !Array.isArray(LEVEL_DATA) || LEVEL_DATA.length !== 5 ||
      LEVEL_DATA.some(level => !level || !Number.isFinite(level.seconds) || level.seconds <= 0 ||
        !Number.isSafeInteger(level.targetMB) || level.targetMB <= 0)) {
    const message = "Invalid level-data.js: provide five levels with positive seconds and positive whole-number targetMB values.";
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
  }

  function startCutscene(looping) {
    clearCutscene();
    nextLevelDetails.hidden = true;
    aiDialogueText.textContent = "Attempting to plot our way back to our time...";
    cutsceneTimer = setTimeout(() => {
      aiDialogueText.textContent = looping ? "Succeeded!" : "Failed, we need more memory.";
      cutsceneTimer = setTimeout(() => {
        if (looping) {
          aiDialogueText.textContent = "Oh. Probably shouldn't have let me watch Time Tunnel before we set off";
          cutsceneTimer = setTimeout(() => {
            nextLevelDetails.hidden = false;
            cutsceneTimer = null;
          }, 2000);
        } else {
          nextLevelDetails.hidden = false;
          cutsceneTimer = null;
        }
      }, 2000);
    }, 3000);
  }

  function renderMemory(message) {
    memoryTotal.textContent = `${memoryMB} / ${currentLevel.targetMB} MB`;
    memoryProgress.max = currentLevel.targetMB;
    memoryProgress.value = Math.min(memoryMB, currentLevel.targetMB);
    memoryMessage.textContent = message;
  }

  function renderClock() {
    const seconds = Math.ceil(remaining);
    timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    timer.classList.toggle("urgent", seconds <= 10);
  }

  function gameOver() {
    currentLevel.controller.leave();
    currentLevel = null;
    paused = false;
    clockStartedAt = null;
    gameScreen.hidden = true;
    gameActions.hidden = true;
    gameOverScreen.hidden = false;
    gameOverReason.textContent = "TIME'S UP";
    gameOverMessage.textContent = "You didn't reach the front doors in time.";
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
    currentLevel.controller.reset();
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

  function exitLevel() {
    updateClock(performance.now());
    if (!currentLevel) return;
    if (memoryMB < currentLevel.targetMB) {
      renderMemory(`Exit locked. Collect ${currentLevel.targetMB - memoryMB} more MB.`);
      return;
    }
    currentLevel.controller.leave();
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
      level.controller.enter(exitLevel, searchComplete);
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
  gameOverTitle.addEventListener("click", showTitle);
  restart.addEventListener("click", () => {
    updateClock(performance.now());
    if (!currentLevel) return;
    resetLevel();
    currentLevel.controller.enter(exitLevel, searchComplete);
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
