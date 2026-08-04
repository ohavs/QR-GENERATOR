#!/usr/bin/env python3
"""מייצר את אייקוני ה-PWA כ-PNG, בלי תלות בספריות חיצוניות.

הציור נעשה ב-supersampling פי 4 ואז ממוצע — מה שנותן קצוות חלקים בלי מנוע
גרפי. מריצים אותו רק כשמעצבים מחדש את האייקון:

    python3 scripts/generate-icons.py
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling

# גרדיאנט המותג: סגול → אינדיגו
C0 = (124, 58, 237)
C1 = (67, 56, 202)
WHITE = (255, 255, 255)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def write_png(path: Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type: none
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def in_rounded_rect(x: float, y: float, left: float, top: float, w: float, h: float, r: float) -> bool:
    if not (left <= x <= left + w and top <= y <= top + h):
        return False
    for cx, cy in (
        (left + r, top + r),
        (left + w - r, top + r),
        (left + r, top + h - r),
        (left + w - r, top + h - r),
    ):
        inside_x = (x < left + r) if cx == left + r else (x > left + w - r)
        inside_y = (y < top + r) if cy == top + r else (y > top + h - r)
        if inside_x and inside_y:
            return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return True


def glyph_cells() -> tuple[list[tuple[int, int, int, int]], list[tuple[int, int]]]:
    """הצורה הלבנה: שלוש עיני איתור מלאות + נקודות דאטה, ברשת 11×11.

    מוחזרות שתי רשימות נפרדות — מלבנים (העיניים) ועיגולים (הדאטה) — כדי
    שהטבעת של העין לא תתפרק לנקודות.
    """
    rects: list[tuple[int, int, int, int]] = []
    for ox, oy in ((0, 0), (8, 0), (0, 8)):
        rects.append((ox, oy, 3, 3))

    dots: list[tuple[int, int]] = [
        (5, 0), (5, 2), (4, 4), (6, 4), (5, 5), (0, 5), (2, 5), (5, 7),
        (8, 5), (10, 5), (8, 8), (10, 8), (9, 9), (8, 10), (10, 10),
    ]
    return rects, dots


def render(size: int, maskable: bool) -> list[list[tuple[int, int, int, int]]]:
    hi = size * SS
    # ב-maskable חובה שהתוכן יישאר בתוך "אזור בטוח" של 80% — מערכות ההפעלה
    # חותכות את הפינות בצורות שונות.
    plate_inset = 0.0 if maskable else hi * 0.06
    plate_radius = hi * (0.5 if maskable else 0.22)
    content = hi * (0.56 if maskable else 0.64)
    origin = (hi - content) / 2
    cell = content / 11.0
    dot_r = cell * 0.5

    rects, dots = glyph_cells()
    # חורי העיניים — מוחזרים לצבע הרקע כדי שהעין תיראה כטבעת ולא כריבוע מלא
    holes = [(ox + 1, oy + 1, 1, 1) for ox, oy in ((0, 0), (8, 0), (0, 8))]
    grid: list[list[tuple[int, int, int, int]]] = []

    for py in range(size):
        row: list[tuple[int, int, int, int]] = []
        for px in range(size):
            acc_r = acc_g = acc_b = acc_a = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = px * SS + sx + 0.5
                    y = py * SS + sy + 0.5

                    if not in_rounded_rect(
                        x, y, plate_inset, plate_inset,
                        hi - plate_inset * 2, hi - plate_inset * 2, plate_radius,
                    ):
                        continue

                    base = lerp(C0, C1, min(1.0, (x + y) / (2 * hi)))
                    color = base

                    gx = (x - origin) / cell
                    gy = (y - origin) / cell

                    for cxx, cyy, cw, ch in rects:
                        if cxx <= gx < cxx + cw and cyy <= gy < cyy + ch:
                            color = WHITE
                            break

                    if color is WHITE:
                        for hxx, hyy, hw, hh in holes:
                            if hxx <= gx < hxx + hw and hyy <= gy < hyy + hh:
                                color = base
                                break
                    else:
                        for dxx, dyy in dots:
                            ccx = origin + (dxx + 0.5) * cell
                            ccy = origin + (dyy + 0.5) * cell
                            if (x - ccx) ** 2 + (y - ccy) ** 2 <= dot_r * dot_r:
                                color = WHITE
                                break

                    acc_r += color[0]
                    acc_g += color[1]
                    acc_b += color[2]
                    acc_a += 255

            n = SS * SS
            if acc_a == 0:
                row.append((0, 0, 0, 0))
            else:
                # ממוצע על הפיקסלים המכוסים בלבד, כדי שהקצה לא ייצא כהה
                covered = acc_a / 255
                row.append((
                    round(acc_r / covered),
                    round(acc_g / covered),
                    round(acc_b / covered),
                    round(acc_a / n),
                ))
        grid.append(row)
    return grid


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, maskable in (
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ):
        write_png(OUT.parent / name if name == "apple-touch-icon.png" else OUT / name,
                  render(size, maskable))
        print(f"✓ {name} ({size}×{size})")


if __name__ == "__main__":
    main()
