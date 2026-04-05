#!/usr/bin/env python3
"""
차량 탑뷰 이미지에서 가장자리와 연결된 검은 배경만 투명 처리해 RGBA PNG로 저장합니다.
(첨부가 .png 확장자여도 JPEG인 경우가 있음 — 알파는 이 스크립트로 생성)

사용: python3 scripts/process-player-car.py 입력.jpg public/images/player-car.png
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


def is_bg(r: int, g: int, b: int) -> bool:
    return r < 52 and g < 52 and b < 52 and (r + g + b) < 145


def flood_background_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    bg = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b = px[x, y]
            if is_bg(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b = px[x, y]
            if is_bg(r, g, b) and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h or bg[ny][nx]:
                continue
            r, g, b = px[nx, ny]
            if is_bg(r, g, b):
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


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    out = flood_background_rgba(Image.open(src))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "PNG", optimize=True)
    a = out.split()[-1].getextrema()
    print(f"OK {dst} alpha extrema={a}")


if __name__ == "__main__":
    main()
