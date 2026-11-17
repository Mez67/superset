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
"""Builds the "Persian Digits" web font used to show numbers with Persian
digits without changing the data.

The font holds only ten glyphs: Vazirmatn's Persian digits (U+06F0-U+06F9),
mapped to the ASCII digits 0-9. Listed first in the theme's font stack, it
draws every digit as a Persian one while letters fall through to the next
font. Copying text, CSV exports and inputs keep the ASCII digits. Vazirmatn is
licensed under the SIL Open Font License 1.1, which allows this derivative.

Usage (needs ``pip install fonttools brotli``)::

    python scripts/brand/make_digits_font.py \\
        superset-frontend/node_modules/@fontsource/vazirmatn/files \\
        superset-frontend/packages/superset-core/src/theme/fonts

It writes ``persian-digits-<weight>.woff2`` and ``OFL.txt``;
``persianDigitsFont.ts`` next to that folder imports the fonts. They are
served from the app's own origin because the default content security policy
does not allow ``data:`` fonts.
"""

import io
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

FONT_DIR = Path(sys.argv[1])
OUT = Path(sys.argv[2])
FAMILY = "Persian Digits"
WEIGHTS = (100, 200, 300, 400, 500, 600, 700, 800, 900)


def build(weight: int) -> bytes:
    font = TTFont(FONT_DIR / f"vazirmatn-arabic-{weight}-normal.woff2")
    cmap = font.getBestCmap()
    glyphs = [cmap[0x06F0 + i] for i in range(10)]

    options = Options()
    options.flavor = "woff2"
    options.layout_features = []
    options.name_IDs = [0, 13, 14]
    options.notdef_outline = True
    options.hinting = False
    subsetter = Subsetter(options)
    subsetter.populate(glyphs=glyphs)
    subsetter.subset(font)

    # Point the ASCII digits at the Persian glyphs; drop every other mapping.
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap = {0x30 + i: glyph for i, glyph in enumerate(glyphs)}
    name = font["name"]
    # Keep the copyright and license notices (name IDs 0, 13, 14) the OFL
    # requires; replace the family names.
    name.names = [n for n in name.names if n.nameID in (0, 13, 14)]
    for name_id, value in (
        (1, FAMILY),
        (2, "Regular"),
        (4, FAMILY),
        (6, "PersianDigits"),
    ):
        name.setName(value, name_id, 3, 1, 0x409)
    font["OS/2"].usWeightClass = weight

    out = io.BytesIO()
    font.flavor = "woff2"
    font.save(out)
    return out.getvalue()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for weight in WEIGHTS:
        data = build(weight)
        total += len(data)
        (OUT / f"persian-digits-{weight}.woff2").write_bytes(data)
    license_file = FONT_DIR.parent / "LICENSE"
    (OUT / "OFL.txt").write_text(license_file.read_text(encoding="utf-8"), "utf-8")
    print(f"{len(WEIGHTS)} weights, {total} bytes of woff2")


if __name__ == "__main__":
    main()
