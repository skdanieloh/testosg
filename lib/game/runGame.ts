/**
 * 캔버스 회피 게임 (터치 전용 UI와 함께 사용)
 */

export type GameTheme = "dark" | "light" | "gray";

export type CarSpec = { body: string; roof: string; window: string };

export const PLAYER_CARS: CarSpec[] = [
  { body: "#c43c3c", roof: "#8b2020", window: "#87ceeb" },
  { body: "#2a6fc4", roof: "#1a4a8a", window: "#b8d4f0" },
  { body: "#2d8f4e", roof: "#1a5c32", window: "#c8e8d8" },
];

const ENEMY_PALETTES: CarSpec[] = [
  { body: "#e8a030", roof: "#b07010", window: "#333" },
  { body: "#9b59b6", roof: "#6c3483", window: "#ddd" },
  { body: "#ecf0f1", roof: "#95a5a6", window: "#2c3e50" },
  { body: "#f39c12", roof: "#b9770e", window: "#2c3e50" },
];

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

function fillRoundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

function drawCar(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  spec: CarSpec,
  dir: number
) {
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

function roadColors(theme: GameTheme) {
  if (theme === "light") {
    return {
      outer: "#c5d0dc",
      road: "#dde5ef",
      dash: "rgba(40,50,65,0.65)",
      edge: "rgba(40,50,65,0.45)",
      shoulder: "rgba(0,0,0,0.06)",
    };
  }
  if (theme === "gray") {
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

function drawRoad(
  c: CanvasRenderingContext2D,
  offset: number,
  theme: GameTheme
) {
  const rt = roadColors(theme);
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

type Enemy = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  palette: CarSpec;
};

/** 10레벨마다 +1 (레벨 1~9 → 0, 10~19 → 1, …) */
function difficultyTier(level: number): number {
  return Math.floor(level / 10);
}

const MILESTONE_BANNER_MS = 2400;

export type GameCallbacks = {
  onFrame: (state: {
    score: number;
    level: number;
  }) => void;
  onGameOver: (result: { score: number; level: number }) => void;
};

export type GameController = {
  start: () => void;
  stop: () => void;
  moveLane: (delta: -1 | 1) => void;
};

export function createGame(
  canvas: HTMLCanvasElement,
  options: {
    carIndex: number;
    theme: GameTheme;
    callbacks: GameCallbacks;
  }
): GameController {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context");

  let running = false;
  let raf = 0;
  let lastTs = 0;
  let laneIndex = 1;
  let playerX = ROAD_MARGIN + LANE_WIDTH * 1.5;
  let roadOffset = 0;
  let score = 0;
  let survivalTime = 0;
  let level = 1;
  let difficulty = 1;
  let spawnAcc = 0;
  let prevLevel = 1;
  let milestoneBannerUntil = 0;
  /** 마일스톤 표시용 (10, 20, 30…) — 플래시 중 레벨이 올라가도 문구 고정 */
  let bannerMilestoneLevel = 10;
  const enemies: Enemy[] = [];

  const laneCenterX = (i: number) => ROAD_MARGIN + LANE_WIDTH * (i + 0.5);

  function shuffleLanes(): number[] {
    const a = [0, 1, 2];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  function syncPlayerX(dt: number) {
    const target = laneCenterX(laneIndex);
    const speed = 420;
    const dx = target - playerX;
    if (Math.abs(dx) < 2) playerX = target;
    else playerX += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  }

  function spawnEnemyAtLane(lane: number, tier: number) {
    const jitter = (Math.random() - 0.5) * LANE_WIDTH * 0.35;
    const x = laneCenterX(lane) + jitter;
    const palette =
      ENEMY_PALETTES[Math.floor(Math.random() * ENEMY_PALETTES.length)];
    const baseVy = 150 + level * 32 + survivalTime * 2.5;
    let vy = baseVy + Math.random() * (70 + level * 8);
    const allowFast = level >= 11;
    const fastChance = allowFast
      ? Math.min(0.5, 0.1 + tier * 0.07)
      : 0;
    if (fastChance > 0 && Math.random() < fastChance) {
      vy *= 1.35 + Math.random() * 1.15;
    }
    const vx = (Math.random() - 0.5) * (38 + level * 4 + tier * 6);
    const yOffset = Math.random() * 55;
    enemies.push({ x, y: -ENEMY_H - 20 - yOffset, vy, vx, palette });
  }

  function rectsOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ) {
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
      if (
        rectsOverlap(p.x, p.y, p.w, p.h, ex, ey, ENEMY_W - 10, ENEMY_H - 10)
      )
        return true;
    }
    return false;
  }

  function frame(ts: number) {
    if (!running || !ctx) return;
    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0;
    lastTs = ts;

    survivalTime += dt;
    level = 1 + Math.floor(survivalTime / 12);
    if (level > prevLevel) {
      const oldM = Math.floor(prevLevel / 10);
      const newM = Math.floor(level / 10);
      if (newM > oldM && level >= 10) {
        bannerMilestoneLevel = newM * 10;
        milestoneBannerUntil = ts + MILESTONE_BANNER_MS;
      }
      prevLevel = level;
    }

    const tier = difficultyTier(level);
    difficulty = 1 + (level - 1) * 0.5 + survivalTime * 0.035 + tier * 0.35;
    const scrollSpeed = 260 + level * 55 + survivalTime * 3 + tier * 40;
    roadOffset += scrollSpeed * dt;
    syncPlayerX(dt);

    spawnAcc += dt;
    const interval = Math.max(
      0.22,
      1.45 -
        level * 0.07 -
        survivalTime * 0.012 -
        tier * 0.09
    );
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      const spawnsPerTick = 1 + tier;
      const lanes = shuffleLanes();
      for (let i = 0; i < spawnsPerTick; i++) {
        spawnEnemyAtLane(lanes[i % LANE_COUNT]!, tier);
      }
    }

    for (const e of enemies) {
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      const minX = ROAD_MARGIN + ENEMY_W / 2;
      const maxX = W - ROAD_MARGIN - ENEMY_W / 2;
      e.x = Math.max(minX, Math.min(maxX, e.x));
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].y > H + 80) enemies.splice(i, 1);
    }

    score +=
      dt * (10 + level * 2 + survivalTime * 0.08) * (1 + difficulty * 0.12);

    options.callbacks.onFrame({
      score: Math.floor(score),
      level,
    });

    if (checkCollisions()) {
      running = false;
      cancelAnimationFrame(raf);
      options.callbacks.onGameOver({
        score: Math.floor(score),
        level,
      });
      return;
    }

    drawRoad(ctx, roadOffset, options.theme);
    for (const e of enemies) {
      drawCar(ctx, e.x, e.y, ENEMY_W, ENEMY_H, e.palette, -1);
    }
    const spec = PLAYER_CARS[options.carIndex] ?? PLAYER_CARS[0];
    drawCar(ctx, playerX, PLAYER_Y, PLAYER_W, PLAYER_H, spec, 1);

    if (ts < milestoneBannerUntil) {
      ctx.save();
      const bannerH = 132;
      const pulse = 0.5 + 0.5 * Math.sin(ts * 0.014);
      ctx.fillStyle = `rgba(0,0,0,${0.45 + pulse * 0.12})`;
      ctx.fillRect(0, 0, W, bannerH);
      ctx.strokeStyle = "rgba(255, 220, 80, 0.85)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, bannerH - 4);

      const label = `LEVEL ${bannerMilestoneLevel}!`;
      const cx = W / 2;
      const ty = 38;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.font =
        '900 52px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#0c1929";
      ctx.strokeText(label, cx, ty);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(label, cx, ty);
      ctx.fillStyle = "#ffe566";
      ctx.fillText(label, cx, ty);

      ctx.font =
        '700 15px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillText(
        `난이도 구간 ${bannerMilestoneLevel} · 웨이브당 ${1 + tier}대` +
          (level >= 11 ? " · L11+ 고속차" : ""),
        cx,
        ty + 58
      );
      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      laneIndex = 1;
      playerX = laneCenterX(1);
      roadOffset = 0;
      score = 0;
      survivalTime = 0;
      level = 1;
      difficulty = 1;
      spawnAcc = 0;
      prevLevel = 1;
      milestoneBannerUntil = 0;
      bannerMilestoneLevel = 10;
      enemies.length = 0;
      lastTs = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    moveLane(delta: -1 | 1) {
      if (!running) return;
      if (delta < 0 && laneIndex > 0) laneIndex--;
      if (delta > 0 && laneIndex < LANE_COUNT - 1) laneIndex++;
    },
  };
}
