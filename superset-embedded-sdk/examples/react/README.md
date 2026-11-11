<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Embedding a Superset dashboard in a React app

This example has two parts:

- `src/SupersetDashboard.tsx` is a reusable React component that embeds a
  dashboard with `@superset-ui/embedded-sdk`. Copy it into your app.
- `server.mjs` is a minimal guest-token endpoint. In your app this belongs in
  your own backend: it logs in to Superset with a service account and returns a
  short-lived guest token, optionally with row level security (RLS) rules for
  the signed-in user. The browser never sees Superset credentials.

## 1. Configure Superset

In `superset_config.py` (for Docker: `docker/pythonpath_dev/superset_config_docker.py`):

```python
FEATURE_FLAGS = {"EMBEDDED_SUPERSET": True}

# Role that guest users get. Give it read access to the datasets the
# embedded dashboards use, and nothing else.
GUEST_ROLE_NAME = "EmbeddedViewer"
GUEST_TOKEN_JWT_SECRET = "change-me-to-a-long-random-string"

# Origins of the apps allowed to show Superset in an iframe.
EMBEDDED_FRAME_ANCESTORS = ["http://localhost:5173"]
```

Restart Superset, open the dashboard, choose **... > Embed dashboard**, enter
your app's origin under allowed domains, and copy the embed id.

The service account used by the token endpoint needs the `can_grant_guest_token`
permission (Admin has it).

## 2. Run the example

```bash
npm install
SUPERSET_URL=http://localhost:8088 SUPERSET_USER=admin SUPERSET_PASSWORD=admin npm run token-server
npm run dev
```

Open `http://localhost:5173/?dashboard=<embed id>`. Add `&country=France` to see
row level security: the token server then limits every dataset to
`country = 'France'`.

## 3. Use it in your app

```tsx
<SupersetDashboard
  dashboardId="<embed id>"
  supersetUrl="https://bi.example.com"
  fetchGuestToken={() =>
    fetch('/api/superset/guest-token?dashboard=<embed id>')
      .then(res => res.json())
      .then(body => body.token)
  }
  uiConfig={{ hideTitle: true, filters: { expanded: false } }}
  height={800}
/>
```

The SDK calls `fetchGuestToken` again before the token expires. Language, text
direction and calendar follow the Superset server, so a Persian Superset with
`CALENDAR = "jalali"` embeds right-to-left with Jalali dates.
