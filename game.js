(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("status");
  const loading = document.getElementById("loading");
  const image = new Image();
  const background = document.createElement("canvas");
  background.width = canvas.width;
  background.height = canvas.height;
  const backgroundCtx = background.getContext("2d");
  const keys = new Set();
  const speed = 185;
  const radius = 14;
  const reach = 33;
  const memorySizes = [0, 4, 8, 16, 32, 64];

  const benches = [
    { x: 140, y: 350, w: 575, h: 134 },
    { x: 840, y: 350, w: 610, h: 134 },
    { x: 130, y: 606, w: 585, h: 138 },
    { x: 840, y: 606, w: 615, h: 138 }
  ];
  const obstacles = [{ x: 137, y: 180, w: 1313, h: 95 }, ...benches];

  // The original image is flattened; these bounds identify the removable displays.
  const computers = [
    ...[
      ["upper-left-printer", 177, 335, 84, 92],
      ["upper-left-computer-1", 280, 336, 83, 91],
      ["upper-left-computer-2", 368, 335, 94, 92],
      ["upper-left-computer-3", 486, 339, 74, 88],
      ["upper-left-computer-4", 604, 336, 76, 91]
    ].map(([id, ...box]) => ({ id, box, bench: 0, sample: 166, shelfTop: 350 })),
    ...[
      ["upper-right-computer-1", 863, 336, 73, 91],
      ["upper-right-computer-2", 958, 340, 62, 87],
      ["upper-right-computer-3", 1044, 336, 64, 91],
      ["upper-right-computer-4", 1150, 340, 70, 87],
      ["upper-right-computer-5", 1246, 340, 64, 87],
      ["upper-right-computer-6", 1370, 350, 56, 77]
    ].map(([id, ...box]) => ({ id, box, bench: 1, sample: 943, shelfTop: 350 })),
    ...[
      ["lower-left-laptop-1", 153, 603, 70, 89],
      ["lower-left-laptop-2", 232, 607, 65, 85],
      ["lower-left-laptop-3", 307, 606, 65, 86],
      ["lower-left-laptop-4", 384, 607, 57, 85]
    ].map(([id, ...box]) => ({ id, box, bench: 2, sample: 450, shelfTop: 606 })),
    ...[
      ["lower-right-computer-1", 866, 604, 70, 88],
      ["lower-right-computer-2", 949, 601, 79, 91],
      ["lower-right-computer-3", 1056, 594, 88, 98],
      ["lower-right-computer-4", 1172, 605, 86, 87],
      ["lower-right-computer-5", 1380, 622, 49, 70]
    ].map(([id, ...box]) => ({ id, box, bench: 3, sample: 940, shelfTop: 606 }))
  ].map((computer, index, list) => {
    const [x, y, w, h] = computer.box;
    const previous = list[index - 1];
    const next = list[index + 1];
    const left = previous && previous.bench === computer.bench
      ? Math.max(x - 4, Math.ceil((previous.box[0] + previous.box[2] + x) / 2))
      : x - 4;
    const right = next && next.bench === computer.bench
      ? Math.min(x + w + 4, Math.floor((x + w + next.box[0]) / 2))
      : x + w + 4;
    const item = computer.id === "upper-left-printer" ? "printer" : computer.bench === 2 ? "laptop" : "computer";
    return { ...computer, box: [left, y - 3, right - left, h + 8], type: "display", item };
  });

  const benchFronts = [
    { x: 140, y: 444, w: 575, oldHeight: 82 },
    { x: 840, y: 444, w: 610, oldHeight: 82 },
    { x: 130, y: 704, w: 585, oldHeight: 87 },
    { x: 840, y: 704, w: 615, oldHeight: 87 }
  ];

  const storageUnits = [
    { id: "storage-1", bounds: { x: 120, y: 38, w: 54, h: 78 }, spriteBounds: { x: 117, y: 35, w: 61, h: 87 } },
    { id: "storage-2", bounds: { x: 359, y: 38, w: 148, h: 80 }, spriteBounds: { x: 355, y: 35, w: 153, h: 87 } },
    { id: "storage-3", bounds: { x: 508, y: 52, w: 132, h: 64 }, spriteBounds: { x: 508, y: 49, w: 137, h: 73 } },
    { id: "storage-4", bounds: { x: 679, y: 38, w: 98, h: 80 }, spriteBounds: { x: 676, y: 35, w: 105, h: 87 } },
    { id: "storage-5", bounds: { x: 900, y: 38, w: 241, h: 80 }, spriteBounds: { x: 897, y: 35, w: 247, h: 87 } },
    { id: "storage-6", bounds: { x: 1179, y: 38, w: 55, h: 80 }, spriteBounds: { x: 1176, y: 35, w: 62, h: 87 } },
    { id: "storage-7", bounds: { x: 1410, y: 38, w: 55, h: 80 }, spriteBounds: { x: 1407, y: 35, w: 64, h: 87 } }
  ].map(unit => ({ ...unit, type: "storage", item: "storage" }));
  const targets = [...computers, ...storageUnits];
  for (const target of targets) {
    const data = typeof ITEM_DATA === "undefined" ? undefined : ITEM_DATA[target.id];
    const duration = data && data.searchSeconds;
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
      const message = `Invalid or missing searchSeconds for ${target.id} in item-data.js; use a positive number of seconds.`;
      loading.textContent = message;
      status.textContent = "SEARCH TIME CONFIGURATION ERROR";
      throw new Error(message);
    }
    target.data = data;
    target.searchDuration = duration;
    target.searchProgress = 0;
    target.searched = false;
  }
  const itemNames = {
    computer: "COMPUTER",
    laptop: "LAPTOP",
    printer: "PRINTER",
    storage: "STORAGE"
  };

  const player = { x: 792, y: 848, moving: false, facing: 1, step: 0 };
  let action = null;
  let lastTime = 0;
  let ready = false;
  let active = false;
  let onExit = null;
  let onSearchComplete = null;
  let lastStatus = "";

  function setStatus(message) {
    if (message !== lastStatus) {
      status.textContent = message;
      lastStatus = message;
    }
  }

  function collides(x, y) {
    if (x - radius < 91 || x + radius > 1495 || y - radius < 128 || y + radius > 878) return true;
    return obstacles.some(rect =>
      x + radius > rect.x && x - radius < rect.x + rect.w &&
      y + radius > rect.y && y - radius < rect.y + rect.h
    );
  }

  function nearestTarget() {
    let best = null;
    let bestDistance = reach;
    for (const target of targets) {
      if (target.searched) continue;
      const bounds = target.type === "display"
        ? { x: target.box[0], y: benches[target.bench].y, w: target.box[2], h: benches[target.bench].h }
        : target.bounds;
      const dx = Math.max(bounds.x - player.x, 0, player.x - (bounds.x + bounds.w));
      const dy = Math.max(bounds.y - player.y, 0, player.y - (bounds.y + bounds.h));
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    return best;
  }

  function prepareComputer(computer) {
    const [x, y, w, h] = computer.box;
    const sprite = document.createElement("canvas");
    sprite.width = w;
    sprite.height = h;
    const spriteCtx = sprite.getContext("2d");
    spriteCtx.drawImage(image, x, y, w, h, 0, 0, w, h);
    const pixels = spriteCtx.getImageData(0, 0, w, h);
    const visited = new Uint8Array(w * h);
    const queue = [];
    function enqueue(px, py) {
      if (px < 0 || px >= w || py < 0 || py >= h) return;
      const index = py * w + px;
      if (visited[index]) return;
      visited[index] = 1;
      const offset = index * 4;
      const r = pixels.data[offset];
      const g = pixels.data[offset + 1];
      const b = pixels.data[offset + 2];
      const isFloor = b > r * 1.25 && b > g * 1.15;
      const isWood = r > 100 && r > g * 1.2 && g > b * 1.4;
      if (isFloor || isWood) queue.push(index);
    }
    for (let px = 0; px < w; px++) {
      enqueue(px, 0);
      enqueue(px, h - 1);
    }
    for (let py = 0; py < h; py++) {
      enqueue(0, py);
      enqueue(w - 1, py);
    }
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      const px = index % w;
      const py = Math.floor(index / w);
      pixels.data[index * 4 + 3] = 0;
      enqueue(px - 1, py);
      enqueue(px + 1, py);
      enqueue(px, py - 1);
      enqueue(px, py + 1);
    }
    spriteCtx.putImageData(pixels, 0, 0);
    computer.sprite = computer.item === "printer" ? createPrinterSprite(w, h) : sprite;

    const floorHeight = Math.max(0, computer.shelfTop - y);
    if (floorHeight) {
      for (let offset = 0; offset < w; offset += 80) {
        const width = Math.min(80, w - offset);
        backgroundCtx.drawImage(image, 735, y, width, floorHeight, x + offset, y, width, floorHeight);
      }
    }
    if (h > floorHeight) {
      backgroundCtx.drawImage(image, computer.sample, y + floorHeight, 1, h - floorHeight,
        x, y + floorHeight, w, h - floorHeight);
      const edgeHeight = Math.max(0, Math.min(h, computer.shelfTop + 5 - y) - floorHeight);
      if (edgeHeight) {
        backgroundCtx.fillStyle = "#14100c";
        backgroundCtx.fillRect(x, y + floorHeight, w, edgeHeight);
      }
    }
  }

  function createPrinterSprite(width, height) {
    const sprite = document.createElement("canvas");
    sprite.width = width;
    sprite.height = height;
    const g = sprite.getContext("2d");
    const x = Math.floor((width - 72) / 2);
    const y = height - 69;
    g.translate(x, y);
    g.fillStyle = "#14151b";
    g.fillRect(15, 0, 40, 28);
    g.fillRect(5, 23, 62, 42);
    g.fillRect(0, 36, 72, 26);
    g.fillStyle = "#e9e3cc";
    g.fillRect(19, 3, 32, 23);
    g.fillStyle = "#a9aaa0";
    g.fillRect(21, 7, 26, 2);
    g.fillRect(21, 12, 26, 2);
    g.fillStyle = "#c8c6b3";
    g.fillRect(8, 26, 56, 32);
    g.fillRect(4, 38, 64, 20);
    g.fillStyle = "#f0ead4";
    g.fillRect(11, 28, 50, 8);
    g.fillStyle = "#767b73";
    g.fillRect(11, 39, 50, 4);
    g.fillRect(14, 50, 45, 7);
    g.fillStyle = "#262b2c";
    g.fillRect(17, 47, 39, 4);
    g.fillRect(57, 30, 4, 3);
    g.fillStyle = "#71a450";
    g.fillRect(51, 30, 3, 3);
    g.fillStyle = "#f0ead4";
    g.fillRect(19, 52, 35, 3);
    return sprite;
  }

  function prepareBackground() {
    backgroundCtx.imageSmoothingEnabled = false;
    backgroundCtx.drawImage(image, 0, 0);
    for (const computer of computers) prepareComputer(computer);
    for (const unit of storageUnits) {
      const { x, y, w, h } = unit.spriteBounds;
      unit.sprite = document.createElement("canvas");
      unit.sprite.width = w;
      unit.sprite.height = h;
      const spriteCtx = unit.sprite.getContext("2d");
      spriteCtx.drawImage(image, x, y, w, h, 0, 0, w, h);
      const pixels = spriteCtx.getImageData(0, 0, w, h);
      const visited = new Uint8Array(w * h);
      const queue = [];
      function enqueue(px, py) {
        if (px < 0 || px >= w || py < 0 || py >= h) return;
        const index = py * w + px;
        if (visited[index]) return;
        visited[index] = 1;
        const i = index * 4;
        const r = pixels.data[i];
        const g = pixels.data[i + 1];
        const b = pixels.data[i + 2];
        const wall = r > 70 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8;
        const floor = b > r * 1.3 && b > g * 1.15;
        if (wall || floor) queue.push(index);
      }
      for (let px = 0; px < w; px++) {
        enqueue(px, 0);
        enqueue(px, h - 1);
      }
      for (let py = 0; py < h; py++) {
        enqueue(0, py);
        enqueue(w - 1, py);
      }
      for (let head = 0; head < queue.length; head++) {
        const index = queue[head];
        const px = index % w;
        const py = Math.floor(index / w);
        if (x + px < unit.bounds.x || x + px >= unit.bounds.x + unit.bounds.w ||
            y + py < unit.bounds.y || y + py >= unit.bounds.y + unit.bounds.h) {
          pixels.data[index * 4 + 3] = 0;
        }
        enqueue(px - 1, py);
        enqueue(px + 1, py);
        enqueue(px, py - 1);
        enqueue(px, py + 1);
      }
      spriteCtx.putImageData(pixels, 0, 0);
      for (let offset = 0; offset < w; offset++) {
        const floorX = 843 + ((x + offset - 843) % 37 + 37) % 37;
        const wallHeight = Math.min(h, Math.max(0, 100 - y));
        if (wallHeight) backgroundCtx.drawImage(image, 340, y, 1, wallHeight, x + offset, y, 1, wallHeight);
        if (h > wallHeight) backgroundCtx.drawImage(image, floorX, y + wallHeight, 1, h - wallHeight,
          x + offset, y + wallHeight, 1, h - wallHeight);
      }
    }
    for (const front of benchFronts) {
      for (let offset = 0; offset < front.w + 16; offset += 80) {
        const width = Math.min(80, front.w + 16 - offset);
        backgroundCtx.drawImage(image, 735, front.y, width, front.oldHeight + 8,
          front.x - 8 + offset, front.y, width, front.oldHeight + 8);
      }
      for (let offset = 0; offset < front.w; offset += 80) {
        const width = Math.min(80, front.w - offset);
        backgroundCtx.drawImage(image, 300, 235, width, 40,
          front.x + offset, front.y, width, 40);
      }
      backgroundCtx.fillStyle = "#14151b";
      backgroundCtx.fillRect(front.x, front.y, 4, 37);
      backgroundCtx.fillRect(front.x + front.w - 4, front.y, 4, 37);
    }
  }

  function drawPlayer() {
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(player.facing * 1.35, 1.35);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.fillRect(-13, -3, 26, 6);
    const legOffset = player.moving && Math.floor(player.step / 8) % 2 ? 3 : 0;
    ctx.fillStyle = "#14151b";
    ctx.fillRect(-9, -11, 8, 10 + legOffset);
    ctx.fillRect(2, -11, 8, 10 - legOffset);
    ctx.fillStyle = "#f4e8d2";
    ctx.fillRect(-10, -29, 20, 19);
    ctx.fillStyle = "#171820";
    ctx.fillRect(-10, -27, 20, 4);
    ctx.fillRect(-10, -19, 20, 4);
    ctx.fillRect(-13, -26, 4, 13);
    ctx.fillRect(10, -26, 4, 13);
    ctx.fillStyle = "#dfb18a";
    ctx.fillRect(-8, -42, 16, 13);
    ctx.fillRect(-13, -14, 4, 4);
    ctx.fillRect(10, -14, 4, 4);
    ctx.fillStyle = "#171820";
    ctx.fillRect(-9, -45, 18, 5);
    ctx.fillRect(-11, -41, 22, 4);
    ctx.fillRect(-8, -37, 16, 4);
    ctx.fillStyle = "#f4e8d2";
    ctx.fillRect(-5, -36, 3, 2);
    ctx.fillRect(3, -36, 3, 2);
    ctx.restore();
  }

  function drawProgress() {
    if (!action) return;
    const x = Math.round(player.x - 36);
    const y = Math.round(player.y - 75);
    ctx.fillStyle = "#14151b";
    ctx.fillRect(x - 3, y - 3, 78, 13);
    ctx.fillStyle = "#5e5b61";
    ctx.fillRect(x, y, 72, 7);
    ctx.fillStyle = "#e9af5d";
    ctx.fillRect(x, y, Math.floor(72 * action.searchProgress / action.searchDuration), 7);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0);
    for (const computer of computers) {
      if (!computer.searched) ctx.drawImage(computer.sprite, computer.box[0], computer.box[1]);
    }
    for (const unit of storageUnits) {
      if (!unit.searched) ctx.drawImage(unit.sprite, unit.spriteBounds.x, unit.spriteBounds.y);
    }
    drawPlayer();
    drawProgress();
  }

  function update(delta) {
    const dx = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
    const dy = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
    const length = Math.hypot(dx, dy);
    player.moving = length > 0;
    if (length) {
      if (action) action = null;
      const moveX = dx / length * speed * delta;
      const moveY = dy / length * speed * delta;
      if (!collides(player.x + moveX, player.y)) player.x += moveX;
      if (!collides(player.x, player.y + moveY)) player.y += moveY;
      if (dx) player.facing = Math.sign(dx);
      player.step += delta * 30;
      if (dy > 0 && player.x >= 735 && player.x <= 850 && player.y >= 860) {
        onExit();
        return;
      }
    }

    if (action) {
      action.searchProgress = Math.min(action.searchProgress + delta, action.searchDuration);
      if (action.searchProgress >= action.searchDuration) {
        if (!onSearchComplete(action.memoryMB)) return;
        action.searched = true;
        action = null;
      }
    }

    const target = !player.moving && nearestTarget();
    if (action) setStatus(`SEARCHING ${itemNames[action.item]}... STAY STILL`);
    else if (targets.every(item => item.searched)) setStatus("EVERYTHING SEARCHED!");
    else if (target) setStatus(`PRESS SPACE TO ${target.searchProgress > 0 ? "RESUME" : "SEARCH"} ${itemNames[target.item]}`);
    else setStatus("EXPLORE THE SHOP");
  }

  function frame(time) {
    if (!ready) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (active && !document.hidden) {
      update(delta);
      draw();
    }
    requestAnimationFrame(frame);
  }

  const movementKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
  document.addEventListener("keydown", event => {
    if (!active || (event.target instanceof Element && event.target.closest("button"))) return;
    const key = event.key.toLowerCase();
    if (movementKeys.has(key)) {
      event.preventDefault();
      if (event.repeat && !keys.has(key)) return;
      if (action) action = null;
      keys.add(key);
    } else if (event.code === "Space") {
      event.preventDefault();
      if (!ready || event.repeat) return;
      if (action) {
        action = null;
        return;
      }
      if (keys.size) return;
      const target = nearestTarget();
      if (target) action = target;
    }
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => {
    keys.clear();
    action = null;
    lastTime = 0;
  });
  function reset() {
    for (const target of targets) {
      target.searched = false;
      target.searchProgress = 0;
      target.memoryMB = memorySizes[Math.floor(Math.random() * memorySizes.length)];
    }
    player.x = 792;
    player.y = 848;
    player.moving = false;
    player.facing = 1;
    keys.clear();
    action = null;
    player.step = 0;
  }

  window.shopLevel = {
    get ready() { return ready; },
    enter(exit, searchComplete) {
      onExit = exit;
      onSearchComplete = searchComplete;
      active = true;
      lastTime = 0;
      canvas.focus();
    },
    leave() {
      active = false;
      keys.clear();
      action = null;
      player.moving = false;
      lastTime = 0;
    },
    reset
  };

  image.onload = () => {
    try {
      prepareBackground();
    } catch (error) {
      console.error("Could not prepare the shop graphics:", error);
      loading.textContent = "COULD NOT PREPARE THE SHOP GRAPHICS. PLEASE RELOAD THE PAGE.";
      setStatus("THE SHOP GRAPHICS COULD NOT BE PREPARED");
      return;
    }
    ready = true;
    loading.hidden = true;
    requestAnimationFrame(frame);
  };
  image.onerror = () => {
    loading.textContent = "COULD NOT LOAD THE SHOP IMAGE. PLEASE CHECK THE ASSETS FOLDER.";
    setStatus("THE SHOP IMAGE COULD NOT BE LOADED");
  };
  if (typeof SHOP_IMAGE_DATA === "undefined") {
    loading.textContent = "COULD NOT LOAD THE SHOP IMAGE DATA. PLEASE CHECK THE ASSETS FOLDER.";
    setStatus("THE SHOP IMAGE DATA COULD NOT BE LOADED");
  } else {
    image.src = SHOP_IMAGE_DATA;
  }
})();
