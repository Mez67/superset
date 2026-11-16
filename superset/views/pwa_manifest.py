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
PWA web app manifest served dynamically.

`APPLICATION_ROOT` and `STATIC_ASSETS_PREFIX` are resolved at request
time so PWA install works under root, subdirectory, and split
static-prefix / app-root deployments. Replaces the static
`superset-frontend/src/pwa-manifest.json` whose hard-coded `/superset/`
literals broke install under non-`/superset` deployments (C5 in PR #39925).
"""

from __future__ import annotations

from typing import Any

from flask import current_app, Response
from flask_appbuilder import expose

from superset.superset_typing import FlaskResponse
from superset.utils import json
from superset.views.base import BaseSupersetView

_MANIFEST_MIMETYPE = "application/manifest+json"
_MANIFEST_CACHE_CONTROL = "public, max-age=0, must-revalidate"


def _normalize_app_root(application_root: str) -> str:
    """Collapse trailing slash so `f"{root}/path"` never doubles the separator.

    `/` and empty string both become empty (the leading `/` of each path is
    preserved exactly once); `/superset` and `/superset/` both become
    `/superset`.
    """
    stripped = application_root.rstrip("/")
    # `/` rstrip yields empty; that's what we want for root deployments.
    return stripped


def _build_manifest(application_root: str, static_assets_prefix: str) -> dict[str, Any]:
    """Return the PWA manifest dict for the given prefix configuration.

    `start_url`, `scope`, and `file_handlers[].action` are app-root-prefixed
    (and literal-corrected from the legacy `/superset/...` form).
    `icons[].src` and `screenshots[].src` are static-prefixed (which may be
    a separate CDN host).
    """
    root = _normalize_app_root(application_root)
    static_prefix = static_assets_prefix.rstrip("/")
    return {
        "name": "Apache Superset",
        "short_name": "Superset",
        "description": "Modern data exploration and visualization platform",
        "start_url": f"{root}/welcome/",
        "scope": f"{root}/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#20a7c9",
        "icons": [
            {
                "src": f"{static_prefix}/static/assets/images/pwa/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": f"{static_prefix}/static/assets/images/pwa/icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": f"{static_prefix}/static/assets/images/pwa/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable",
            },
            {
                "src": f"{static_prefix}/static/assets/images/pwa/icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable",
            },
        ],
        "screenshots": [
            {
                "src": (
                    f"{static_prefix}/static/assets/images/pwa/screenshot-wide.png"
                ),
                "sizes": "1280x720",
                "type": "image/png",
                "form_factor": "wide",
                "label": "Apache Superset Dashboard",
            },
            {
                "src": (
                    f"{static_prefix}/static/assets/images/pwa/screenshot-narrow.png"
                ),
                "sizes": "540x720",
                "type": "image/png",
                "form_factor": "narrow",
                "label": "Apache Superset Mobile View",
            },
        ],
        "file_handlers": [
            {
                "action": f"{root}/file-handler",
                "accept": {
                    "text/csv": [".csv"],
                    "application/vnd.ms-excel": [".xls"],
                    "application/vnd.openxmlformats-officedocument."
                    "spreadsheetml.sheet": [".xlsx"],
                    "application/vnd.apache.parquet": [".parquet"],
                },
            }
        ],
    }


def _apply_overrides(
    manifest: dict[str, Any], overrides: dict[str, Any], static_assets_prefix: str
) -> dict[str, Any]:
    """Replace top-level manifest fields with ``PWA_MANIFEST_OVERRIDES``.

    Root-relative ``src`` paths of icons and screenshots get the static assets
    prefix, like the built-in entries.
    """
    static_prefix = static_assets_prefix.rstrip("/")
    result = dict(manifest)
    for key, value in overrides.items():
        if key in ("icons", "screenshots"):
            value = [
                {**item, "src": f"{static_prefix}{item['src']}"}
                if item.get("src", "").startswith("/")
                else dict(item)
                for item in value
            ]
            for item in value:
                if "type" not in item and item.get("src", "").endswith(".png"):
                    item["type"] = "image/png"
        result[key] = value
    return result


class PwaManifestView(BaseSupersetView):
    """Serve the PWA web app manifest with deployment-aware prefixes.

    Unauthenticated (PWA install fetch has no session); mirrors the
    `RedirectView` precedent (`superset/views/redirect.py`).
    """

    route_base = ""

    @expose("/pwa-manifest.json")
    def manifest(self) -> FlaskResponse:
        application_root = current_app.config["APPLICATION_ROOT"]
        # `STATIC_ASSETS_PREFIX` defaults to `""`; under subdir, `app.py`
        # backfills it with `app_root` unless the operator set a CDN host.
        # We mirror that fallback so root deployments produce `/static/...`
        # rather than `/static/...` with an empty prefix gap.
        static_assets_prefix = (
            current_app.config["STATIC_ASSETS_PREFIX"] or application_root
        )
        manifest = _apply_overrides(
            _build_manifest(application_root, static_assets_prefix),
            current_app.config.get("PWA_MANIFEST_OVERRIDES") or {},
            static_assets_prefix,
        )
        return Response(
            json.dumps(manifest, separators=(",", ":")),
            mimetype=_MANIFEST_MIMETYPE,
            headers={"Cache-Control": _MANIFEST_CACHE_CONTROL},
        )
