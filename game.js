(function () {
  "use strict";

  const SHARE_BASE = "https://testosg.vercel.app";
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

  const LS_NAME = "dodge-my-name";
  const LS_THEME = "dodge-theme";
  const LS_ROOM = "dodge-room-id";
  const LS_JOINED = "dodge-joined-room";
  const LS_BEST_SCORE = "dodge-best";
  const LS_BEST_LEVEL = "dodge-best-level";

  /** @type {HTMLCanvasElement | null} */
  const canvas = document.getElementById("game");
  /** @type {CanvasRenderingContext2D | null} */
  const ctx = canvas && canvas.getContext("2d");

  const selectScreen = document.getElementById("select-screen");
  const gameScreen = document.getElementById("game-screen");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const personalBestScoreEl = document.getElementById("personal-best-score");
  const personalBestLevelEl = document.getElementById("personal-best-level");
  const touchLeft = document.getElementById("touch-left");
  const touchRight = document.getElementById("touch-right");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayScore = document.getElementById("overlay-score");
  const restartBtn = document.getElementById("restart-btn");

  const myNameInput = document.getElementById("my-name");
  const createRoomBtn = document.getElementById("create-room-btn");
  const roomLabel = document.getElementById("room-label");
  const duelHint = document.getElementById("duel-hint");
  const joinBanner = document.getElementById("join-banner");
  const joinNameInput = document.getElementById("join-name");
  const joinBtn = document.getElementById("join-btn");
  const duelBoard = document.getElementById("duel-board");
  const duelList = document.getElementById("duel-list");

  const themeSelect = document.getElementById("theme-select");
  const shareBtn = document.getElementById("share-btn");
  const shareModal = document.getElementById("share-modal");
  const shareBackdrop = document.getElementById("share-backdrop");
  const shareUrlText = document.getElementById("share-url-text");
  const shareModalDesc = document.getElementById("share-modal-desc");
  const qrcodeHost = document.getElementById("qrcode-host");
  const copyLinkBtn = document.getElementById("copy-link-btn");
  const closeShareBtn = document.getElementById("close-share-btn");

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
  let bestScorePersonal = Number(localStorage.getItem(LS_BEST_SCORE) || "0") || 0;
  let bestLevelPersonal = Math.max(
    1,
    Number(localStorage.getItem(LS_BEST_LEVEL) || "1") || 1
  );
  let running = false;
  let lastTs = 0;
  let spawnAcc = 0;
  let survivalTime = 0;
  let level = 1;
  let difficulty = 1;
  /** @type {{ x: number, y: number, vy: number, vx: number, palette: (typeof ENEMY_PALETTES)[0] }[]} */
  let enemies = [];

  let roomId = "";
  let apiOnline = true;
  let pollTimer = 0;

  function getRoadTheme() {
    const t = document.body.getAttribute("data-theme") || "dark";
    if (t === "light") {
      return {
        outer: "#c5d0dc",
        road: "#dde5ef",
        dash: "rgba(40,50,65,0.65)",
        edge: "rgba(40,50,65,0.45)",
        shoulder: "rgba(0,0,0,0.06)",
      };
    }
    if (t === "gray") {
      return {
        outer: "#2f3338",
        road: "#4a5058",
        dash: "rgba(255,255,255,0.5)",
        edge: "rgba(255,255,255,0.28)",
        shoulder: "rgba(0,0,0,0.25)",
      };
    }
    return {
      outer: "#1e2633",
      road: "#2d3848",
      dash: "rgba(255,255,255,0.55)",
      edge: "rgba(255,255,255,0.35)",
      shoulder: "rgba(0,0,0,0.2)",
    };
  }

  function parseRoomFromUrl() {
    const p = new URLSearchParams(window.location.search).get("room");
    if (p && /^[a-z0-9]{8,12}$/.test(p)) return p;
    return "";
  }

  function initIdentity() {
    const saved = localStorage.getItem(LS_NAME) || "";
    if (myNameInput) myNameInput.value = saved;
    const th = localStorage.getItem(LS_THEME) || "dark";
    if (themeSelect) {
      themeSelect.value = th === "light" || th === "gray" || th === "dark" ? th : "dark";
      document.body.setAttribute("data-theme", themeSelect.value);
    }
    roomId = parseRoomFromUrl() || localStorage.getItem(LS_ROOM) || "";
    if (roomId && !parseRoomFromUrl()) {
      const u = new URL(window.location.href);
      u.searchParams.set("room", roomId);
      history.replaceState({}, "", u.toString());
    }
    updateRoomLabel();
    const urlRoom = parseRoomFromUrl();
    const joinedRoom = localStorage.getItem(LS_JOINED) || "";
    if (urlRoom && joinedRoom !== urlRoom) {
      joinBanner?.classList.remove("hidden");
      if (joinNameInput && !joinNameInput.value) joinNameInput.value = saved;
    } else {
      joinBanner?.classList.add("hidden");
    }
    refreshDuelBoard();
    startPolling();
  }

  function myName() {
    return (myNameInput?.value || "").trim();
  }

  function updateRoomLabel() {
    if (!roomLabel) return;
    if (roomId) {
      roomLabel.textContent = `방 ID: ${roomId}`;
    } else {
      roomLabel.textContent = "방 없음 · 대결 방 만들기로 친구와 연결";
    }
  }

  function updatePersonalBar() {
    if (personalBestScoreEl) personalBestScoreEl.textContent = String(Math.floor(bestScorePersonal));
    if (personalBestLevelEl) personalBestLevelEl.textContent = String(bestLevelPersonal);
  }

  async function apiPost(body) {
    const r = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }

  async function apiGetRoom(id) {
    const r = await fetch(`/api/room?id=${encodeURIComponent(id)}`);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }

  async function refreshDuelBoard() {
    if (!duelBoard || !duelList) return;
    if (!roomId) {
      duelBoard.classList.add("hidden");
      return;
    }
    const { ok, data } = await apiGetRoom(roomId);
    if (!ok || !data.ok || !data.room) {
      duelBoard.classList.add("hidden");
      if (data && data.error === "not_found") {
        duelHint.textContent = "방을 찾을 수 없습니다. 새 방을 만드세요.";
        roomId = "";
        localStorage.removeItem(LS_ROOM);
        updateRoomLabel();
      }
      return;
    }
    apiOnline = true;
    duelBoard.classList.remove("hidden");
    const members = data.room.members || {};
    const rows = Object.entries(members)
      .map(([name, v]) => ({
        name,
        bestScore: v.bestScore ?? 0,
        bestLevel: v.bestLevel ?? 0,
      }))
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return b.bestLevel - a.bestLevel;
      });
    const me = myName();
    duelList.innerHTML = rows
      .map((row, i) => {
        const cls = row.name === me ? ' class="me"' : "";
        return `<li${cls}><span>${i + 1}</span><span>${escapeHtml(row.name)}</span><span>${row.bestScore}</span><span>${row.bestLevel}</span></li>`;
      })
      .join("");
    if (!rows.length) {
      duelList.innerHTML =
        '<li class="empty duel-list-grid"><span>—</span><span>참가자 없음</span><span>—</span><span>—</span></li>';
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      if (roomId) refreshDuelBoard();
    }, 4000);
  }

  createRoomBtn?.addEventListener("click", async () => {
    const name = myName();
    if (!name) {
      duelHint.textContent = "먼저 내 이름을 입력하세요.";
      myNameInput?.focus();
      return;
    }
    duelHint.textContent = "방을 만드는 중…";
    const { ok, data, status } = await apiPost({ action: "create" });
    if (!ok || !data.ok) {
      apiOnline = false;
      duelHint.textContent =
        status === 503
          ? "Vercel 프로젝트에 Redis(Upstash)를 연결하고 UPSTASH_REDIS_REST_URL·TOKEN을 설정하세요."
          : "방을 만들 수 없습니다.";
      return;
    }
    roomId = data.roomId;
    localStorage.setItem(LS_ROOM, roomId);
    localStorage.setItem(LS_NAME, name);
    const u = new URL(window.location.href);
    u.searchParams.set("room", roomId);
    history.replaceState({}, "", u.toString());
    await apiPost({ action: "join", roomId, name });
    localStorage.setItem(LS_JOINED, roomId);
    joinBanner?.classList.add("hidden");
    duelHint.textContent = "방이 생성되었습니다. 공유하기로 QR을 보내 보세요.";
    updateRoomLabel();
    refreshDuelBoard();
  });

  joinBtn?.addEventListener("click", async () => {
    const rid = parseRoomFromUrl();
    const name = (joinNameInput?.value || "").trim();
    if (!rid || !name) {
      duelHint.textContent = "이름을 입력하세요.";
      return;
    }
    const { ok, data, status } = await apiPost({ action: "join", roomId: rid, name });
    if (!ok || !data.ok) {
      duelHint.textContent =
        status === 503 ? "서버 저장소가 설정되지 않았습니다." : "참가에 실패했습니다.";
      return;
    }
    roomId = rid;
    localStorage.setItem(LS_ROOM, roomId);
    localStorage.setItem(LS_NAME, name);
    localStorage.setItem(LS_JOINED, rid);
    if (myNameInput) myNameInput.value = name;
    joinBanner?.classList.add("hidden");
    duelHint.textContent = "참가했습니다. 같은 방 랭킹에 최고 점수·레벨이 반영됩니다.";
    updateRoomLabel();
    refreshDuelBoard();
  });

  myNameInput?.addEventListener("change", () => {
    const v = myName();
    if (v) localStorage.setItem(LS_NAME, v);
  });

  themeSelect?.addEventListener("change", () => {
    const v = themeSelect.value;
    document.body.setAttribute("data-theme", v);
    localStorage.setItem(LS_THEME, v);
  });

  function shareUrlForQr() {
    if (roomId) {
      return `${SHARE_BASE.replace(/\/$/, "")}/?room=${encodeURIComponent(roomId)}`;
    }
    return `${SHARE_BASE.replace(/\/$/, "")}/`;
  }

  function openShareModal() {
    if (!shareModal || !qrcodeHost || !shareUrlText) return;
    const url = shareUrlForQr();
    shareUrlText.textContent = url;
    if (shareModalDesc) {
      shareModalDesc.textContent = roomId
        ? "같은 방에서 최고 점수·레벨을 겨룹니다. 게임 오버 시 기록이 랭킹에 반영됩니다."
        : "친구가 같은 앱으로 들어온 뒤, 각자 이름을 입력하고 「대결 방 만들기」로 방을 만들면 랭킹 대결을 할 수 있습니다.";
    }
    qrcodeHost.innerHTML = "";
    const QR = window.QRCode;
    if (typeof QR === "function") {
      const dark = document.body.getAttribute("data-theme") === "light" ? "#111111" : "#000000";
      new QR(qrcodeHost, {
        text: url,
        width: 200,
        height: 200,
        colorDark: dark,
        colorLight: "#ffffff",
      });
    } else {
      qrcodeHost.textContent = "QR 라이브러리를 불러오지 못했습니다.";
    }
    shareModal.classList.remove("hidden");
    shareModal.setAttribute("aria-hidden", "false");
  }

  function closeShareModal() {
    shareModal?.classList.add("hidden");
    shareModal?.setAttribute("aria-hidden", "true");
  }

  shareBtn?.addEventListener("click", openShareModal);
  shareBackdrop?.addEventListener("click", closeShareModal);
  closeShareBtn?.addEventListener("click", closeShareModal);
  copyLinkBtn?.addEventListener("click", async () => {
    const url = shareUrlForQr();
    try {
      await navigator.clipboard.writeText(url);
      duelHint.textContent = "링크를 복사했습니다.";
    } catch {
      duelHint.textContent = "복사에 실패했습니다. 아래 주소를 직접 선택해 복사하세요.";
    }
  });

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
    const rt = getRoadTheme();
    const left = ROAD_MARGIN;
    const right = W - ROAD_MARGIN;
    c.fillStyle = rt.outer;
    c.fillRect(0, 0, W, H);
    c.fillStyle = rt.road;
    c.fillRect(left, 0, right - left, H);

    const dashLen = 40;
    const gap = 35;
    const period = dashLen + gap;
    const shift = offset % period;
    c.strokeStyle = rt.dash;
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
    c.strokeStyle = rt.edge;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(left, 0);
    c.lineTo(left, H);
    c.moveTo(right, 0);
    c.lineTo(right, H);
    c.stroke();

    c.fillStyle = rt.shoulder;
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
    const baseVy = 150 + level * 32 + survivalTime * 2.5;
    const vy = baseVy + Math.random() * (70 + level * 8);
    const vx = (Math.random() - 0.5) * (38 + level * 4);
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

  async function submitRoomScore(finalScore, finalLevel) {
    const name = myName();
    if (!roomId || !name || !apiOnline) return;
    const { ok, data, status } = await apiPost({
      action: "score",
      roomId,
      name,
      score: finalScore,
      level: finalLevel,
    });
    if (status === 503) apiOnline = false;
    if (ok && data.ok) refreshDuelBoard();
  }

  function gameOver() {
    running = false;
    const final = Math.floor(score);
    const finalLevel = level;
    const prevScore = bestScorePersonal;
    const prevLevel = bestLevelPersonal;
    const parts = [];
    if (final > prevScore) {
      bestScorePersonal = final;
      localStorage.setItem(LS_BEST_SCORE, String(bestScorePersonal));
      parts.push("최고 점수");
    }
    if (finalLevel > prevLevel) {
      bestLevelPersonal = finalLevel;
      localStorage.setItem(LS_BEST_LEVEL, String(bestLevelPersonal));
      parts.push("최고 레벨");
    }
    updatePersonalBar();
    overlayTitle.textContent = "게임 오버";
    const extra = parts.length ? `\n${parts.join(" · ")} 갱신!` : "";
    overlayScore.textContent = `이번 판 · 점수 ${final} · 레벨 ${finalLevel}${extra}`;
    overlay.classList.remove("hidden");
    submitRoomScore(final, finalLevel);
  }

  function frame(ts) {
    if (!ctx || !canvas) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0;
    lastTs = ts;

    if (running) {
      survivalTime += dt;
      level = 1 + Math.floor(survivalTime / 12);
      difficulty = 1 + (level - 1) * 0.5 + survivalTime * 0.035;

      const scrollSpeed = 260 + level * 55 + survivalTime * 3;
      roadOffset += scrollSpeed * dt;

      syncPlayerX(dt);

      spawnAcc += dt;
      const interval = Math.max(0.28, 1.45 - level * 0.07 - survivalTime * 0.012);
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

      score += dt * (10 + level * 2 + survivalTime * 0.08) * (1 + difficulty * 0.12);

      if (checkCollisions()) gameOver();
    }

    drawRoad(ctx, roadOffset);
    for (const e of enemies) {
      drawCar(ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.palette, -1);
    }
    const spec = CAR_SPECS[selectedCarIndex] || CAR_SPECS[0];
    drawCar(ctx, playerX, PLAYER_Y, PLAYER_W, PLAYER_H, spec, 1);

    scoreEl.textContent = String(Math.floor(score));
    levelEl.textContent = String(level);

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
    survivalTime = 0;
    level = 1;
    difficulty = 1;
    spawnAcc = 0;
    enemies = [];
    running = true;
    overlay.classList.add("hidden");
    updatePersonalBar();
    lastTs = performance.now();
    if (canvas) canvas.focus();
  }

  function backToSelect() {
    running = false;
    gameScreen.classList.add("hidden");
    selectScreen.classList.remove("hidden");
    overlay.classList.add("hidden");
  }

  function moveLane(delta) {
    if (!running) return;
    if (delta < 0 && laneIndex > 0) laneIndex--;
    if (delta > 0 && laneIndex < LANE_COUNT - 1) laneIndex++;
  }

  window.addEventListener("keydown", (e) => {
    if (e.code !== "ArrowLeft" && e.code !== "ArrowRight") return;
    e.preventDefault();
    if (e.code === "ArrowLeft") moveLane(-1);
    if (e.code === "ArrowRight") moveLane(1);
  });

  function bindTouch(btn, delta) {
    if (!btn) return;
    btn.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        moveLane(delta);
      },
      { passive: false }
    );
  }
  bindTouch(touchLeft, -1);
  bindTouch(touchRight, 1);

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

  updatePersonalBar();
  initPreviews();
  initIdentity();
  lastTs = performance.now();
  requestAnimationFrame(frame);
})();
