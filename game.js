(function () {
  "use strict";

  const W = 420;
  const H = 640;
  const ROAD_MARGIN = 36;
  const LANE_COUNT = 3;
  const LANE_WIDTH = (W - ROAD_MARGIN * 2) / LANE_COUNT;

  const PLAYER_Y = H - 120;
  const PLAYER_W = 44;
  const PLAYER_H = 72;
  const ENEMY_W = 42;
  const ENEMY_H = 68;

  /** @type {HTMLCanvasElement | null} */
  const canvas = document.getElementById("game");
  /** @type {CanvasRenderingContext2D | null} */
  const ctx = canvas && canvas.getContext("2d");

  const selectScreen = document.getElementById("select-screen");
  const gameScreen = document.getElementById("game-screen");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayScore = document.getElementById("overlay-score");
  const restartBtn = document.getElementById("restart-btn");

  const CAR_SPECS = [
    { body: "#c43c3c", roof: "#8b2020", window: "#87ceeb" },
    { body: "#2a6fc4", roof: "#1a4a8a", window: "#b8d4f0" },
    { body: "#2d8f4e", roof: "#1a5c32", window: "#c8e8d8" },
  ];

  const ENEMY_PALETTES = [
    { body: "#e8a030", roof: "#b07010", window: "#333" },
    { body: "#9b59b6", roof: "#6c3483", window: "#ddd" },
    { body: "#ecf0f1", roof: "#95a5a6", window: "#2c3e50" },
    { body: "#f39c12", roof: "#b9770e", window: "#2c3e50" },
  ];

  let selectedCarIndex = -1;
  let laneIndex = 1;
  let playerX = 0;
  let roadOffset = 0;
  let score = 0;
  let best = Number(localStorage.getItem("dodge-best") || "0") || 0;
  let running = false;
  let lastTs = 0;
  let spawnAcc = 0;
  let difficulty = 1;
  /** @type {{ x: number, y: number, vy: number, vx: number, palette: typeof ENEMY_PALETTES[0] }[]} */
  let enemies = [];

  function laneCenterX(i) {
    return ROAD_MARGIN + LANE_WIDTH * (i + 0.5);
  }

  function fillRoundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr);
    c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr);
    c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
    c.fill();
  }

  function drawCar(c, cx, cy, w, h, spec, dir) {
    const flip = dir < 0 ? -1 : 1;
    c.save();
    c.translate(cx, cy);
    c.scale(1, flip);
    const bw = w * 0.45;
    const bh = h * 0.22;
    c.fillStyle = spec.body;
    fillRoundRect(c, -w / 2, -h / 2 + 8, w, h - 16, 6);
    c.fillStyle = spec.roof;
    fillRoundRect(c, -bw, -h / 2 + 18, bw * 2, bh, 4);
    c.fillStyle = spec.window;
    c.fillRect(-bw * 0.85, -h / 2 + 22, bw * 1.7, bh * 0.55);
    c.fillStyle = "#111";
    const wheelY = h / 2 - 22;
    c.fillRect(-w / 2 - 2, -wheelY, 8, 14);
    c.fillRect(w / 2 - 6, -wheelY, 8, 14);
    c.fillRect(-w / 2 - 2, wheelY - 14, 8, 14);
    c.fillRect(w / 2 - 6, wheelY - 14, 8, 14);
    c.restore();
  }

  function drawRoad(c, offset) {
    const left = ROAD_MARGIN;
    const right = W - ROAD_MARGIN;
    c.fillStyle = "#1e2633";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#2d3848";
    c.fillRect(left, 0, right - left, H);

    const dashLen = 40;
    const gap = 35;
    const period = dashLen + gap;
    const shift = offset % period;
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 3;
    c.setLineDash([dashLen, gap]);
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = left + LANE_WIDTH * i;
      c.beginPath();
      c.moveTo(lx, shift - period);
      c.lineTo(lx, H + period);
      c.stroke();
    }
    c.setLineDash([]);
    c.strokeStyle = "rgba(255,255,255,0.35)";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(left, 0);
    c.lineTo(left, H);
    c.moveTo(right, 0);
    c.lineTo(right, H);
    c.stroke();

    c.fillStyle = "rgba(0,0,0,0.2)";
    c.fillRect(0, 0, left - 2, H);
    c.fillRect(right + 2, 0, W - right - 2, H);
  }

  function drawPreviewCanvas(previewCanvas, carIdx) {
    const p = previewCanvas.getContext("2d");
    if (!p) return;
    p.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    drawCar(p, previewCanvas.width / 2, previewCanvas.height / 2 + 8, 48, 72, CAR_SPECS[carIdx], 1);
  }

  function initPreviews() {
    document.querySelectorAll(".preview").forEach((el) => {
      const idx = Number(el.dataset.preview);
      if (!Number.isNaN(idx)) drawPreviewCanvas(/** @type {HTMLCanvasElement} */ (el), idx);
    });
  }

  function syncPlayerX(dt) {
    const target = laneCenterX(laneIndex);
    const speed = 420;
    const dx = target - playerX;
    if (Math.abs(dx) < 2) playerX = target;
    else playerX += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  }

  function spawnEnemy() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const jitter = (Math.random() - 0.5) * LANE_WIDTH * 0.35;
    const x = laneCenterX(lane) + jitter;
    const palette = ENEMY_PALETTES[Math.floor(Math.random() * ENEMY_PALETTES.length)];
    const baseVy = 180 + difficulty * 28;
    const vy = baseVy + Math.random() * 60;
    const vx = (Math.random() - 0.5) * 45;
    enemies.push({ x, y: -ENEMY_H - 20, vy, vx, palette });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function playerHitbox() {
    const shrink = 8;
    return {
      x: playerX - PLAYER_W / 2 + shrink / 2,
      y: PLAYER_Y - PLAYER_H / 2 + shrink / 2,
      w: PLAYER_W - shrink,
      h: PLAYER_H - shrink,
    };
  }

  function checkCollisions() {
    const p = playerHitbox();
    for (const e of enemies) {
      const ex = e.x - ENEMY_W / 2 + 5;
      const ey = e.y - ENEMY_H / 2 + 5;
      if (rectsOverlap(p.x, p.y, p.w, p.h, ex, ey, ENEMY_W - 10, ENEMY_H - 10)) return true;
    }
    return false;
  }

  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem("dodge-best", String(best));
    }
    bestEl.textContent = String(best);
    overlayTitle.textContent = "게임 오버";
    overlayScore.textContent = `점수: ${Math.floor(score)}`;
    overlay.classList.remove("hidden");
  }

  function frame(ts) {
    if (!ctx || !canvas) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0;
    lastTs = ts;

    if (running) {
      const scrollSpeed = 280 + difficulty * 40;
      roadOffset += scrollSpeed * dt;

      syncPlayerX(dt);

      spawnAcc += dt;
      const interval = Math.max(0.55, 1.35 - difficulty * 0.12);
      if (spawnAcc >= interval) {
        spawnAcc = 0;
        spawnEnemy();
      }

      for (const e of enemies) {
        e.y += e.vy * dt;
        e.x += e.vx * dt;
        const minX = ROAD_MARGIN + ENEMY_W / 2;
        const maxX = W - ROAD_MARGIN - ENEMY_W / 2;
        e.x = Math.max(minX, Math.min(maxX, e.x));
      }
      enemies = enemies.filter((e) => e.y < H + 80);

      score += dt * 12 * (1 + difficulty * 0.15);
      difficulty += dt * 0.04;

      if (checkCollisions()) gameOver();
    }

    drawRoad(ctx, roadOffset);
    for (const e of enemies) {
      drawCar(ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.palette, -1);
    }
    const spec = CAR_SPECS[selectedCarIndex] || CAR_SPECS[0];
    drawCar(ctx, playerX, PLAYER_Y, PLAYER_W, PLAYER_H, spec, 1);

    scoreEl.textContent = String(Math.floor(score));

    requestAnimationFrame(frame);
  }

  function startGame() {
    if (selectedCarIndex < 0) return;
    selectScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    laneIndex = 1;
    playerX = laneCenterX(1);
    roadOffset = 0;
    score = 0;
    difficulty = 1;
    spawnAcc = 0;
    enemies = [];
    running = true;
    overlay.classList.add("hidden");
    bestEl.textContent = String(best);
    lastTs = performance.now();
    if (canvas) canvas.focus();
  }

  function backToSelect() {
    running = false;
    gameScreen.classList.add("hidden");
    selectScreen.classList.remove("hidden");
    overlay.classList.add("hidden");
  }

  window.addEventListener("keydown", (e) => {
    if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
    e.preventDefault();
    if (!running) return;
    if (e.code === "ArrowLeft" && laneIndex > 0) laneIndex--;
    if (e.code === "ArrowRight" && laneIndex < LANE_COUNT - 1) laneIndex++;
  });

  document.querySelectorAll(".car-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.car);
      selectedCarIndex = idx;
      document.querySelectorAll(".car-option").forEach((b) => {
        b.classList.toggle("selected", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      startBtn.disabled = false;
    });
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", backToSelect);

  bestEl.textContent = String(best);
  initPreviews();
  lastTs = performance.now();
  requestAnimationFrame(frame);
})();
