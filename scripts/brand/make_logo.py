# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Builds the داده‌نما logo SVGs: the wordmark is shaped with HarfBuzz and
converted to outlines so it renders the same everywhere (no font needed).

Usage (needs ``pip install uharfbuzz fonttools brotli``)::

    python scripts/brand/make_logo.py \
        superset-frontend/node_modules/@fontsource/vazirmatn/files /tmp/brand
    node scripts/brand/rasterize_icons.js /tmp/brand /tmp/brand

Then copy the SVG and PNG files into superset-frontend/src/assets/images/brand.
"""

import io
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT_DIR = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
NAME = "داده‌نما"

INDIGO_TOP = "#5c7cfa"
INDIGO_BOTTOM = "#364fc7"


def wordmark(weight: int, size: float) -> tuple[str, float, float, float]:
    """Return (path d, advance width, ascent, descent) at ``size`` px."""
    font_path = FONT_DIR / f"vazirmatn-arabic-{weight}-normal.woff2"
    tt = TTFont(font_path)
    # HarfBuzz cannot read WOFF2; hand it the decompressed sfnt.
    tt.flavor = None
    raw = io.BytesIO()
    tt.save(raw)
    data = raw.getvalue()
    tt = TTFont(io.BytesIO(data))
    upem = tt["head"].unitsPerEm
    face = hb.Face(data)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(NAME)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    scale = size / upem
    glyph_set = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions, strict=True):
        name = order[info.codepoint]
        # Flip y (font units are y-up) and scale to px.
        tpen = TransformPen(
            pen,
            (scale, 0, 0, -scale, (x + pos.x_offset) * scale, -pos.y_offset * scale),
        )
        glyph_set[name].draw(tpen)
        x += pos.x_advance
    hhea = tt["hhea"]
    return pen.getCommands(), x * scale, hhea.ascent * scale, -hhea.descent * scale


def mark(x: float, y: float, s: float, gid: str, animated: bool = False) -> str:
    """Rounded indigo tile with three rising bars and a trend dot."""
    k = s / 32
    bars = [(8, 18, 9), (14, 12, 15), (20, 7, 20)]  # (x, top, height)
    parts = [
        f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{INDIGO_TOP}"/>'
        f'<stop offset="1" stop-color="{INDIGO_BOTTOM}"/></linearGradient></defs>',
        f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{8 * k:.2f}" '
        f'fill="url(#{gid})"/>',
    ]
    for i, (bx, top, h) in enumerate(bars):
        anim = ""
        if animated:
            # Bars share a baseline at 27 units; grow each from 4 units tall.
            timing = f'dur="1.2s" begin="{i * 0.15:.2f}s" repeatCount="indefinite"'
            anim = (
                f'<animate attributeName="height" '
                f'values="{4 * k:.2f};{h * k:.2f};{4 * k:.2f}" {timing}/>'
                f'<animate attributeName="y" '
                f'values="{y + 23 * k:.2f};{y + top * k:.2f};{y + 23 * k:.2f}" '
                f"{timing}/>"
            )
        opacity = ["0.7", "0.85", "1"][i]
        parts.append(
            f'<rect x="{x + bx * k:.2f}" y="{y + top * k:.2f}" width="{4 * k:.2f}" '
            f'height="{h * k:.2f}" rx="{2 * k:.2f}" fill="#fff" '
            f'fill-opacity="{opacity}">{anim}</rect>'
        )
    return "".join(parts)


def svg(w: float, h: float, body: str, label: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" '
        f'width="{w:.2f}" height="{h:.2f}" role="img" aria-label="{label}">'
        f"<title>{label}</title>{body}</svg>\n"
    )


# Horizontal logo: mark on the right (read first in RTL), wordmark to its left.
H = 40
MARK = 40
GAP = 10
d, adv, asc, desc = wordmark(800, 30)
text_h = asc + desc
W = adv + GAP + MARK
baseline = (H - text_h) / 2 + asc + 1
for variant, color in (("logo-horiz", "#1b2230"), ("logo-horiz-dark", "#e6e9ef")):
    body = (
        f'<path transform="translate(0 {baseline:.2f})" fill="{color}" d="{d}"/>'
        + mark(adv + GAP, 0, MARK, "g")
    )
    (OUT / f"{variant}.svg").write_text(svg(W, H, body, NAME), encoding="utf-8")

# Square mark: favicon / app icon.
(OUT / "logo-mark.svg").write_text(
    svg(32, 32, mark(0, 0, 32, "g"), NAME), encoding="utf-8"
)

# Animated mark used as the loading spinner.
(OUT / "spinner.svg").write_text(
    svg(32, 32, mark(0, 0, 32, "gs", animated=True), NAME), encoding="utf-8"
)
print(f"wordmark {adv:.1f}px wide, logo {W:.1f}x{H}")

# Full-bleed tile for maskable app icons: the OS applies its own mask, so the
# bars sit inside the central safe zone (80%).
maskable = (
    '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1">'
    f'<stop offset="0" stop-color="{INDIGO_TOP}"/>'
    f'<stop offset="1" stop-color="{INDIGO_BOTTOM}"/>'
    '</linearGradient></defs><rect width="32" height="32" fill="url(#m)"/>'
    '<g transform="translate(6.4 6.4) scale(0.6)">'
    + "".join(
        f'<rect x="{bx}" y="{top}" width="4" height="{h}" rx="2" fill="#fff" '
        f'fill-opacity="{o}"/>'
        for (bx, top, h), o in zip(
            [(8, 18, 9), (14, 12, 15), (20, 7, 20)], ["0.7", "0.85", "1"], strict=True
        )
    )
    + "</g>"
)
(OUT / "maskable.svg").write_text(svg(32, 32, maskable, NAME), encoding="utf-8")
