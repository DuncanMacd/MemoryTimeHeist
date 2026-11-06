(() => {
  "use strict";

  const titleScreen = document.getElementById("title-screen");
  const gameScreen = document.getElementById("game-screen");
  const gameActions = document.getElementById("game-actions");
  const subtitle = document.getElementById("subtitle");
  const start = document.getElementById("start");
  const menu = document.getElementById("menu");

  const levels = [
    { id: "computer-shop", title: "Computer Shop", controller: window.shopLevel }
  ];
  let currentLevel = null;

  function enterLevel(level) {
    titleScreen.hidden = true;
    gameScreen.hidden = false;
    gameActions.hidden = false;
    subtitle.textContent = `FIRST STOP: ${level.title}`;
    currentLevel = level;
    if (level.controller) {
      level.controller.enter();
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
    if (currentLevel && currentLevel.controller) currentLevel.controller.leave();
    currentLevel = null;
    gameScreen.hidden = true;
    gameActions.hidden = true;
    titleScreen.hidden = false;
    subtitle.textContent = "A journey through the computer age.";
    start.focus();
  }

  start.addEventListener("click", () => enterLevel(levels[0]));
  menu.addEventListener("click", showTitle);
})();
