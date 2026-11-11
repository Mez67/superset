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
"""
Brand theme layered on top of the built-in light and dark themes.

Everything that defines the look of this distribution (palette, radii,
shadows, per-component tokens) lives here rather than in ``config.py`` so
upstream changes to the default theme merge without conflicts. Any token set
in ``superset_config.py`` (``THEME_DEFAULT`` / ``THEME_DARK``) or in a system
theme still wins over these values.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# Tokens shared by light and dark: shape, spacing and type.
_COMMON_TOKENS: dict[str, Any] = {
    "borderRadius": 8,
    "borderRadiusLG": 12,
    "borderRadiusSM": 6,
    "borderRadiusXS": 4,
    "fontSize": 14,
    # Superset button tokens: larger, easier to read labels (Persian glyphs
    # are hard to read at 12px).
    "buttonFontSize": 13,
    "buttonBorderRadius": 8,
    "buttonPaddingInline": 16,
    "labelBorderRadius": 6,
    "dashboardTileBorderRadius": 12,
    "resultsGridBorderRadius": 8,
    "resultsGridHeaderFontWeight": 600,
    "fontWeightStrong": "600",
    "motionDurationMid": "0.2s",
}

_LIGHT_TOKENS: dict[str, Any] = {
    "colorPrimary": "#3b5bdb",
    "colorLink": "#3b5bdb",
    "colorInfo": "#3b82f6",
    "colorSuccess": "#2f9e6e",
    "colorWarning": "#f59f00",
    "colorError": "#e03131",
    "colorText": "#1b2230",
    "colorTextSecondary": "#566074",
    "colorTextTertiary": "#8a93a5",
    "colorBgLayout": "#f4f6fa",
    "colorBorder": "#dde3ec",
    "colorBorderSecondary": "#ebeef4",
    "colorSplit": "#edf0f5",
    "boxShadow": (
        "0 12px 32px -8px rgba(16, 24, 40, 0.14), 0 4px 8px -4px rgba(16, 24, 40, 0.08)"
    ),
    "boxShadowSecondary": (
        "0 8px 24px -6px rgba(16, 24, 40, 0.14), 0 2px 6px -2px rgba(16, 24, 40, 0.08)"
    ),
    "boxShadowTertiary": "0 1px 2px rgba(16, 24, 40, 0.05)",
    "dashboardTileBorder": "1px solid #e6eaf1",
    "dashboardTileBoxShadow": "0 1px 2px rgba(16, 24, 40, 0.05)",
    "colorEditorSelection": "#dbe4ff",
}

_DARK_TOKENS: dict[str, Any] = {
    "colorPrimary": "#5c7cfa",
    "colorLink": "#7d97ff",
    "colorInfo": "#4dabf7",
    "colorSuccess": "#38b27d",
    "colorWarning": "#fab005",
    "colorError": "#f0565b",
    "colorText": "#e6e9ef",
    "colorTextSecondary": "#a9b1c1",
    "colorTextTertiary": "#7a8396",
    # Charts such as the table paint headers with colorBgBase; matching the
    # tile surface avoids black bands inside dark dashboard tiles.
    "colorBgBase": "#161b24",
    "colorBgLayout": "#0f131a",
    "colorBgContainer": "#161b24",
    "colorBgElevated": "#1c2230",
    "colorBorder": "#2c3442",
    "colorBorderSecondary": "#232a36",
    "colorSplit": "#232a36",
    "boxShadow": "0 12px 32px -8px rgba(0, 0, 0, 0.6)",
    "boxShadowSecondary": "0 8px 24px -6px rgba(0, 0, 0, 0.55)",
    "boxShadowTertiary": "0 1px 2px rgba(0, 0, 0, 0.4)",
    "dashboardTileBorder": "1px solid #262e3b",
    "dashboardTileBoxShadow": "none",
    "colorEditorSelection": "#2f3f75",
}


# Default categorical palette for charts: brand indigo first, then hues that
# stay distinct from each other in light and dark mode.
BRAND_COLOR_SCHEME: dict[str, Any] = {
    "id": "brandIndigo",
    "label": "نیلی مدرن",
    "description": "",
    "isDefault": True,
    "colors": [
        "#3b5bdb",
        "#20c997",
        "#fab005",
        "#f76707",
        "#7950f2",
        "#15aabf",
        "#e64980",
        "#82c91e",
        "#495057",
        "#ff8787",
    ],
}


def _echarts_overrides(dark: bool) -> dict[str, Any]:
    """Softer, card-like chart tooltips that match the rest of the UI."""
    return {
        "tooltip": {
            "backgroundColor": "#1c2230" if dark else "#ffffff",
            "borderColor": "#2c3442" if dark else "#e6eaf1",
            "borderWidth": 1,
            "borderRadius": 10,
            "padding": [8, 12],
            "shadowBlur": 16,
            "shadowOffsetY": 4,
            "shadowColor": "rgba(0, 0, 0, 0.45)" if dark else "rgba(16, 24, 40, 0.12)",
            "textStyle": {"color": "#e6e9ef" if dark else "#1b2230"},
        },
    }


def _components(dark: bool) -> dict[str, Any]:
    """Per-component Ant Design tokens."""
    primary = _DARK_TOKENS["colorPrimary"] if dark else _LIGHT_TOKENS["colorPrimary"]
    selected_bg = "rgba(92, 124, 250, 0.16)" if dark else "#edf2ff"
    hover_bg = "#1e2533" if dark else "#f4f6fb"
    focus_ring = (
        "0 0 0 3px rgba(92, 124, 250, 0.25)"
        if dark
        else "0 0 0 3px rgba(59, 91, 219, 0.12)"
    )
    return {
        "Button": {
            "fontWeight": 500,
            "primaryShadow": "none",
            "defaultShadow": "none",
            "dangerShadow": "none",
        },
        "Card": {
            "headerFontSize": 15,
        },
        "Table": {
            "headerBg": "#1a202b" if dark else "#f7f9fc",
            "headerColor": "#a9b1c1" if dark else "#4a5468",
            "headerSplitColor": "transparent",
            "rowHoverBg": hover_bg,
            "rowSelectedBg": selected_bg,
            "borderColor": "#232a36" if dark else "#eef1f6",
            "cellPaddingBlock": 12,
        },
        "Menu": {
            "itemBorderRadius": 8,
            "itemSelectedBg": selected_bg,
            "itemSelectedColor": primary,
            "itemHoverBg": hover_bg,
            "horizontalItemSelectedColor": primary,
            "horizontalItemHoverColor": primary,
        },
        "Dropdown": {
            "controlItemBgHover": hover_bg,
            "controlItemBgActive": selected_bg,
        },
        "Select": {
            "optionSelectedBg": selected_bg,
            "optionActiveBg": hover_bg,
            "activeOutlineColor": "transparent",
        },
        "Input": {"activeShadow": focus_ring},
        "InputNumber": {"activeShadow": focus_ring},
        "DatePicker": {"activeShadow": focus_ring},
        "Tabs": {
            "itemSelectedColor": primary,
            "inkBarColor": primary,
            "itemHoverColor": primary,
        },
        "Modal": {
            "borderRadiusLG": 14,
            "titleFontSize": 17,
        },
        "Tag": {
            "defaultBg": "#1e2533" if dark else "#f1f4f9",
        },
        "Segmented": {
            "itemSelectedBg": "#232a36" if dark else "#ffffff",
            "trackBg": "#0f131a" if dark else "#eef1f6",
        },
        "Collapse": {
            "headerBg": "transparent",
        },
    }


def _merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    result = dict(base)
    for key, value in overlay.items():
        if isinstance(result.get(key), dict) and isinstance(value, dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def with_brand_theme(theme: dict[str, Any], dark: bool = False) -> dict[str, Any]:
    """Return ``theme`` with the brand tokens layered on top."""
    tokens = {
        **_COMMON_TOKENS,
        **(_DARK_TOKENS if dark else _LIGHT_TOKENS),
        "echartsOptionsOverrides": _echarts_overrides(dark),
    }
    return _merge(theme, {"token": tokens, "components": _components(dark)})
