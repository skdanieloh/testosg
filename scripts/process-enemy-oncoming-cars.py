#!/usr/bin/env python3
"""
탑뷰 맞은편(온커밝) 차량 PNG — 흰 배경 제거 → 알파로 차량 영역만 크롭 →
플레이어 차 스프라이트와 동일 픽셀 크기로 맞춤 → 색상 변형 PNG 여러 장.

- 크롭: 투명이 아닌 픽셀의 최소 바운딩 박스만 사용(정사각 패딩 없음).
- 리사이즈: public/images/player-car.png 와 같은 (가로×세로)로 맞춰,
  게임에서 플레이어와 비슷한 스케일로 보이고 세로가 더 긴 비율을 갖게 함.

사용:
  python3 scripts/process-enemy-oncoming-cars.py assets/enemy-oncoming-source.png public/images \\
    [player-car.png 경로]

player 경로 생략 시 public/images/player-car.png 사용.
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_background_rgb(r: int, g: int, b: int) -> bool:
    """스튜디오 흰·연회색 배경(가장자리에서 flood). 차량 본체는 보통 대비/채도가 남음."""
    avg = (r + g + b) / 3
    spread = max(r, g, b) - min(r, g, b)
    return avg >= 232 and spread <= 32


def flood_edge_background_rgba(im: Image.Image) -> Image.Image:
    if im.mode in ("P", "RGBA"):
        im = im.convert("RGBA")
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b = px[x, y]
            if is_background_rgb(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b = px[x, y]
            if is_background_rgb(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h or bg[ny][nx]:
                continue
            r, g, b = px[nx, ny]
            if is_background_rgb(r, g, b):
                bg[ny][nx] = True
                q.append((nx, ny))

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if bg[y][x]:
                op[x, y] = (0, 0, 0, 0)
            else:
                op[x, y] = (r, g, b, 255)
    return out


def crop_alpha_bbox(im: Image.Image) -> Image.Image:
    """완전 투명이 아닌 픽셀의 바운딩 박스로만 자름(차량 실루엣만, 정사각 강제 없음)."""
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    a = im.split()[-1]
    bbox = a.getbbox()
    if bbox is None:
        return im
    return im.crop(bbox)


def resize_to_player_sheet(
    im: Image.Image,
    player_path: Path,
) -> Image.Image:
    """
    플레이어 스프라이트와 동일 해상도로 스케일.
    크롭이 정사각이어도 플레이어와 같은 세로가 긴 캔버스 비율로 맞춤(게임에서 유사 크기·비율).
    """
    if not player_path.is_file():
        raise FileNotFoundError(f"player sprite not found: {player_path}")
    ref = Image.open(player_path).convert("RGBA")
    tw, th = ref.size
    ref.close()
    return im.resize((tw, th), Image.Resampling.LANCZOS)


def tint_body(
    im: Image.Image,
    mr: float,
    mg: float,
    mb: float,
) -> Image.Image:
    """
    밝은 본체(페인트)에만 곱하기 — 유리·어두운 부분은 보존.
    mr,mg,mb ≈ 0~1.2 (흰차 기준 채색)
    """
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                op[x, y] = (0, 0, 0, 0)
                continue
            spread = max(r, g, b) - min(r, g, b)
            lum = (r + g + b) / 3
            # 밝은 페인트 영역만 색상 입힘
            if lum > 175 and spread < 48:
                nr = min(255, int(r * mr))
                ng = min(255, int(g * mg))
                nb = min(255, int(b * mb))
                op[x, y] = (nr, ng, nb, a)
            else:
                op[x, y] = (r, g, b, a)
    return out


# (파일 접미사, mr, mg, mb) — 흰색 기준 곱셈 계수
VARIANTS: list[tuple[str, float, float, float]] = [
    ("white", 1.0, 1.0, 1.0),
    ("silver", 0.88, 0.9, 0.93),
    ("graphite", 0.38, 0.4, 0.44),
    ("blue", 0.55, 0.72, 1.05),
    ("red", 1.05, 0.42, 0.42),
    ("yellow", 1.02, 0.92, 0.38),
    ("emerald", 0.42, 0.88, 0.62),
]


def main() -> None:
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    player_ref = (
        Path(sys.argv[3])
        if len(sys.argv) == 4
        else out_dir / "player-car.png"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    base = flood_edge_background_rgba(Image.open(src))
    base = crop_alpha_bbox(base)
    w, h = base.size
    print(f"Cropped (car alpha bbox only): {w}x{h}, aspect h/w={h / max(w, 1):.4f}")
    base = resize_to_player_sheet(base, player_ref)
    w, h = base.size
    print(f"Scaled to match player sheet: {w}x{h}")

    for name, mr, mg, mb in VARIANTS:
        tinted = tint_body(base, mr, mg, mb)
        dst = out_dir / f"enemy-oncoming-{name}.png"
        tinted.save(dst, "PNG", optimize=True)
        print(f"OK {dst}")

    # 메타: 스프라이트 목록 (게임에서 순서 고정)
    manifest = out_dir / "enemy-oncoming-manifest.txt"
    manifest.write_text(
        "\n".join(f"enemy-oncoming-{n}.png" for n, _, _, _ in VARIANTS) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {manifest}")


if __name__ == "__main__":
    main()
