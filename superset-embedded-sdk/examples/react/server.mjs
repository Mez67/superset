/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Guest-token endpoint for the embedded dashboard example.
 *
 * In a real app this lives in YOUR backend: it knows who the signed-in user
 * is, decides what they may see (row level security), and asks Superset for
 * a short-lived guest token with a Superset service account. The browser
 * only ever receives the guest token.
 *
 * Run: SUPERSET_URL=http://localhost:8088 SUPERSET_USER=embed-bot \
 *      SUPERSET_PASSWORD=... node server.mjs
 */
import { createServer } from 'node:http';

const SUPERSET_URL = process.env.SUPERSET_URL ?? 'http://localhost:8088';
const SUPERSET_USER = process.env.SUPERSET_USER ?? 'admin';
const SUPERSET_PASSWORD = process.env.SUPERSET_PASSWORD ?? 'admin';
const PORT = Number(process.env.PORT ?? 3001);

let accessToken = null;

async function supersetLogin() {
  const res = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: SUPERSET_USER,
      password: SUPERSET_PASSWORD,
      provider: 'db',
      refresh: false,
    }),
  });
  if (!res.ok) throw new Error(`Superset login failed: ${res.status}`);
  accessToken = (await res.json()).access_token;
}

async function requestGuestToken(body, retry = true) {
  if (!accessToken) await supersetLogin();
  const res = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    accessToken = null;
    return requestGuestToken(body, false);
  }
  if (!res.ok) throw new Error(`Guest token request failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token;
}

/**
 * Who is asking and what they may see. Replace with your own session lookup:
 * this example reads a demo "user" from the query string.
 */
function currentUser(url) {
  const user = url.searchParams.get('user') ?? 'demo';
  const country = url.searchParams.get('country');
  return {
    user: { username: user, first_name: user, last_name: '' },
    // Row level security: limit every dataset on the dashboard to one
    // country for this user. Use your own rules, per user or per tenant.
    rls: country ? [{ clause: `country = '${country.replace(/'/g, "''")}'` }] : [],
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== '/api/superset/guest-token') {
    res.writeHead(404).end();
    return;
  }
  const dashboardId = url.searchParams.get('dashboard');
  if (!dashboardId) {
    res.writeHead(400).end('missing dashboard');
    return;
  }
  try {
    const { user, rls } = currentUser(url);
    const token = await requestGuestToken({
      user,
      resources: [{ type: 'dashboard', id: dashboardId }],
      rls,
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token }));
  } catch (err) {
    console.error(err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message ?? err) }));
  }
}).listen(PORT, () => {
  console.log(`guest-token server on http://localhost:${PORT}`);
});
