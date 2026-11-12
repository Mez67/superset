#!/usr/bin/env python3
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
"""Add frontend ``t()`` strings that pybabel's JavaScript extractor misses.

pybabel reads a template literal as one opaque token, so ``t()`` calls inside
`` `${t('SHA')}: ...` `` are invisible to it, and so is a ``t()`` nested in the
arguments of another ``t()``. Those strings never reach the catalogs and stay
English in every language. This script scans the frontend sources for
``t('literal')`` calls (string concatenation included) and appends every
msgid the .pot lacks.

Usage: extract_missed_calls.py superset/translations/messages.pot
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import polib  # type: ignore[import-untyped]

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIRS = ("src", "packages", "plugins")
SKIP_PARTS = ("node_modules", "/lib/", "/esm/", "/test/", "/spec/", "__mocks__")
SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".test.js", ".test.jsx", ".stories.tsx")

LITERAL = r"""('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\$]|\\.)*`)"""
CALL = re.compile(
    r"(?<![\w.$])t\(\s*(" + LITERAL + r"(?:\s*\+\s*" + LITERAL + r")*)\s*[,)]",
    re.S,
)
PART = re.compile(LITERAL, re.S)
BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"^\s*//.*$", re.M)


def _unquote(literal: str) -> str:
    body = literal[1:-1]
    if literal[0] == "`":
        body = body.replace("\\`", "`")
    body = body.replace("\\'", "'").replace('"', '\\"').replace('\\\\"', '\\"')
    body = body.replace("\n", "\\n").replace("\t", "\\t")
    try:
        return json.loads(f'"{body}"')
    except json.JSONDecodeError:
        return literal[1:-1]


def frontend_msgids() -> dict[str, str]:
    """Map each t() literal in the frontend to the first file using it."""
    found: dict[str, str] = {}
    for top in SOURCE_DIRS:
        for path in sorted((ROOT / "superset-frontend" / top).rglob("*")):
            name = str(path)
            if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            if any(part in name for part in SKIP_PARTS) or name.endswith(SKIP_SUFFIXES):
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            text = LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", text))
            for match in CALL.finditer(text):
                msgid = "".join(_unquote(p) for p in PART.findall(match.group(1)))
                if msgid.strip():
                    found.setdefault(msgid, str(path.relative_to(ROOT)))
    return found


def main(pot_path: str) -> int:
    pot = polib.pofile(pot_path, wrapwidth=0)
    known = {entry.msgid for entry in pot}
    added = 0
    for msgid, source in frontend_msgids().items():
        if msgid in known:
            continue
        pot.append(polib.POEntry(msgid=msgid, msgstr="", occurrences=[(source, "")]))
        added += 1
    if added:
        pot.save(pot_path)
    print(f"extract_missed_calls: added {added} msgids to {pot_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
