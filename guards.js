(() => {
  "use strict";

  const visionRange = 220;
  const guardRadius = 14;
  const searchSeconds = 1.5;
  const leftRoute = [
    { x: 265, y: 150 }, { x: 115, y: 150 }, { x: 115, y: 310 },
    { x: 780, y: 310 }, { x: 780, y: 525 }, { x: 115, y: 525 },
    { x: 115, y: 780 }, { x: 780, y: 780 }, { x: 780, y: 525 },
    { x: 1470, y: 525 }, { x: 1470, y: 780 }, { x: 805, y: 780 },
    { x: 805, y: 525 }, { x: 805, y: 310 }, { x: 1470, y: 310 },
    { x: 1470, y: 150 }, { x: 1320, y: 150 }
  ];
  const routes = [leftRoute, [...leftRoute].reverse()];

  function intersectsRect(a, b, rect) {
    let min = 0;
    let max = 1;
    for (const [start, delta, low, high] of [
      [a.x, b.x - a.x, rect.x, rect.x + rect.w],
      [a.y, b.y - a.y, rect.y, rect.y + rect.h]
    ]) {
      if (delta === 0) {
        if (start < low || start > high) return false;
      } else {
        const first = (low - start) / delta;
        const second = (high - start) / delta;
        min = Math.max(min, Math.min(first, second));
        max = Math.min(max, Math.max(first, second));
        if (min > max) return false;
      }
    }
    return true;
  }

  function clearLine(a, b, obstacles) {
    return !obstacles.some(rect => intersectsRect(a, b, rect));
  }

  function createSecurityGuards(count, behaviour, arrival, speed, playerSpeed, obstacles, collides, onAlert) {
    const expanded = obstacles.map(rect => ({
      x: rect.x - guardRadius + 0.01,
      y: rect.y - guardRadius + 0.01,
      w: rect.w + 2 * (guardRadius - 0.01),
      h: rect.h + 2 * (guardRadius - 0.01)
    }));
    const corners = expanded.flatMap(rect => [
      { x: rect.x - 1, y: rect.y - 1 },
      { x: rect.x + rect.w + 1, y: rect.y - 1 },
      { x: rect.x - 1, y: rect.y + rect.h + 1 },
      { x: rect.x + rect.w + 1, y: rect.y + rect.h + 1 }
    ]).filter(point => !collides(point.x, point.y));
    const guards = [];
    let elapsed = 0;

    function addDueGuards() {
      while (guards.length < count) {
        const index = guards.length;
        const wave = arrival.initialDelay === 0 ? Math.floor(index / 2) : index;
        if (elapsed < arrival.initialDelay + wave * arrival.interval) break;
        const route = routes[index % 2];
        guards.push({
          x: route[0].x, y: route[0].y, route, waypoint: 1,
          facing: index % 2 ? -1 : 1, step: 0, target: null, searching: 0,
          pathPoint: null, pathMode: null, burstUsed: false, burstRemaining: 0
        });
      }
    }

    addDueGuards();

    function nextPoint(start, target) {
      if (clearLine(start, target, expanded)) return target;
      const points = [start, target, ...corners];
      const distances = points.map(() => Infinity);
      const previous = points.map(() => -1);
      const visited = points.map(() => false);
      distances[0] = 0;
      for (let n = 0; n < points.length; n++) {
        let current = -1;
        for (let i = 0; i < points.length; i++) {
          if (!visited[i] && (current === -1 || distances[i] < distances[current])) current = i;
        }
        if (current === -1 || !Number.isFinite(distances[current]) || current === 1) break;
        visited[current] = true;
        for (let i = 1; i < points.length; i++) {
          if (visited[i] || !clearLine(points[current], points[i], expanded)) continue;
          const distance = distances[current] + Math.hypot(points[i].x - points[current].x, points[i].y - points[current].y);
          if (distance < distances[i]) {
            distances[i] = distance;
            previous[i] = current;
          }
        }
      }
      if (previous[1] === -1) return null;
      let next = 1;
      while (previous[next] !== 0) next = previous[next];
      return points[next];
    }

    function move(guard, target, movementSpeed, delta, mode) {
      if (guard.pathMode !== mode) {
        guard.pathPoint = null;
        guard.pathMode = mode;
      }
      const next = guard.pathPoint || nextPoint(guard, target);
      if (!next) return;
      // Finish rounding a corner before recalculating the route to avoid oscillation.
      if (next !== target) guard.pathPoint = next;
      const dx = next.x - guard.x;
      const dy = next.y - guard.y;
      const distance = Math.hypot(dx, dy);
      if (!distance) return;
      const amount = Math.min(distance, movementSpeed * delta);
      const x = guard.x + dx / distance * amount;
      const y = guard.y + dy / distance * amount;
      if (!collides(x, y)) {
        guard.x = x;
        guard.y = y;
        if (amount === distance) guard.pathPoint = null;
        if (dx) guard.facing = Math.sign(dx);
        guard.step += delta * 30;
      }
    }

    function update(player, delta, elapsedDelta = delta) {
      elapsed += elapsedDelta;
      addDueGuards();
      const seen = guards.map(guard => behaviour !== "route" &&
        Math.hypot(player.x - guard.x, player.y - guard.y) <= visionRange &&
        clearLine(guard, player, obstacles));
      const sharedSighting = behaviour === "fullforce" && seen.some(Boolean);
      if (guards.some((guard, i) => (seen[i] || sharedSighting) && !guard.target)) onAlert();
      for (let i = 0; i < guards.length; i++) {
        const guard = guards[i];
        if (seen[i] || sharedSighting) {
          guard.target = { x: player.x, y: player.y };
          guard.searching = searchSeconds;
          if (!guard.burstUsed) {
            guard.burstUsed = true;
            guard.burstRemaining = speed.burstSeconds;
          }
        }
        const burstTime = Math.min(delta, guard.burstRemaining);
        const movementSpeed = delta > 0
          ? playerSpeed * (speed.normal + (speed.burst - speed.normal) * burstTime / delta)
          : playerSpeed * speed.normal;
        guard.burstRemaining = Math.max(0, guard.burstRemaining - elapsedDelta);
        if (guard.target) {
          if (Math.hypot(guard.target.x - guard.x, guard.target.y - guard.y) <= 2) {
            guard.pathPoint = null;
            guard.searching -= delta;
            if (guard.searching <= 0) guard.target = null;
          } else {
            move(guard, guard.target, movementSpeed, delta, "chase");
          }
        } else {
          const target = guard.route[guard.waypoint];
          if (Math.hypot(target.x - guard.x, target.y - guard.y) <= 2) {
            guard.pathPoint = null;
            guard.waypoint = (guard.waypoint + 1) % guard.route.length;
          } else {
            move(guard, target, movementSpeed, delta, "patrol");
          }
        }
        if (Math.hypot(player.x - guard.x, player.y - guard.y) < guardRadius + 14 &&
            clearLine(guard, player, obstacles)) return true;
      }
      return false;
    }

    function draw(ctx) {
      for (const guard of guards) {
        ctx.save();
        ctx.translate(Math.round(guard.x), Math.round(guard.y));
        ctx.scale(guard.facing * 1.5, 1.5);
        ctx.fillStyle = "rgba(0,0,0,.4)";
        ctx.fillRect(-13, -3, 26, 6);
        const legOffset = Math.floor(guard.step / 8) % 2 ? 3 : 0;
        ctx.fillStyle = "#14151b";
        ctx.fillRect(-9, -11, 8, 10 + legOffset);
        ctx.fillRect(2, -11, 8, 10 - legOffset);
        ctx.fillStyle = "#345b9a";
        ctx.fillRect(-10, -29, 20, 19);
        ctx.fillRect(-13, -26, 4, 13);
        ctx.fillRect(10, -26, 4, 13);
        ctx.fillStyle = "#1c304f";
        ctx.fillRect(-10, -16, 20, 4);
        ctx.fillStyle = "#e9af5d";
        ctx.fillRect(3, -26, 3, 3);
        ctx.fillRect(-2, -16, 4, 3);
        ctx.fillStyle = "#dfb18a";
        ctx.fillRect(-8, -42, 16, 13);
        ctx.fillRect(-13, -14, 4, 4);
        ctx.fillRect(10, -14, 4, 4);
        ctx.fillStyle = "#345b9a";
        ctx.fillRect(-9, -47, 18, 8);
        ctx.fillStyle = "#1c304f";
        ctx.fillRect(-11, -40, 22, 4);
        ctx.fillStyle = "#e9af5d";
        ctx.fillRect(-2, -46, 4, 3);
        ctx.fillStyle = "#171820";
        ctx.fillRect(-5, -34, 3, 2);
        ctx.fillRect(3, -34, 3, 2);
        ctx.restore();
      }
    }

    return { guards, update, draw };
  }

  window.createSecurityGuards = createSecurityGuards;
})();
