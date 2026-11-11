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
from typing import Any

from superset.brand_theme import BRAND_COLOR_SCHEME, with_brand_theme


def test_with_brand_theme_keeps_unrelated_tokens() -> None:
    base: dict[str, Any] = {
        "token": {"brandAppName": "Superset", "colorPrimary": "#000000"},
        "components": {"Tooltip": {"fontSize": 12}},
        "algorithm": "default",
    }
    themed = with_brand_theme(base)

    assert themed["token"]["brandAppName"] == "Superset"
    assert themed["token"]["colorPrimary"] == "#3b5bdb"
    assert themed["components"]["Tooltip"] == {"fontSize": 12}
    assert "Table" in themed["components"]
    assert themed["algorithm"] == "default"
    # The input is not modified.
    assert base["token"]["colorPrimary"] == "#000000"
    assert "Table" not in base["components"]


def test_with_brand_theme_dark_overrides_light_surfaces() -> None:
    light = with_brand_theme({"token": {}})
    dark = with_brand_theme({"token": {}, "algorithm": "dark"}, dark=True)

    assert light["token"]["colorBgLayout"] != dark["token"]["colorBgLayout"]
    assert dark["token"]["colorBgContainer"] == dark["token"]["colorBgBase"]
    tooltip = dark["token"]["echartsOptionsOverrides"]["tooltip"]
    assert tooltip["backgroundColor"] == dark["token"]["colorBgElevated"]


def test_config_applies_brand_theme_and_palette() -> None:
    from superset import config

    assert config.THEME_DEFAULT["token"]["colorPrimary"] == "#3b5bdb"
    assert config.THEME_DARK is not None
    assert config.THEME_DARK["algorithm"] == "dark"
    assert config.THEME_DARK["token"]["colorBgLayout"] == "#0f131a"
    assert BRAND_COLOR_SCHEME in config.EXTRA_CATEGORICAL_COLOR_SCHEMES
    assert BRAND_COLOR_SCHEME["isDefault"] is True
