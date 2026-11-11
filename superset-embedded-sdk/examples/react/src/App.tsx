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
import { useCallback } from 'react';
import SupersetDashboard from './SupersetDashboard';

const SUPERSET_URL = import.meta.env.VITE_SUPERSET_URL ?? 'http://localhost:8088';
const params = new URLSearchParams(window.location.search);
const DASHBOARD_ID = params.get('dashboard') ?? import.meta.env.VITE_DASHBOARD_ID ?? '';

export default function App() {
  // Asks this app's own backend for a guest token. The query string only
  // simulates who is signed in; a real backend reads its session instead.
  const fetchGuestToken = useCallback(async () => {
    const query = new URLSearchParams({ dashboard: DASHBOARD_ID });
    const country = params.get('country');
    if (country) query.set('country', country);
    const res = await fetch(`/api/superset/guest-token?${query}`);
    if (!res.ok) throw new Error(`guest token: ${res.status}`);
    return (await res.json()).token as string;
  }, []);

  if (!DASHBOARD_ID) {
    return <p style={{ padding: 24 }}>?dashboard=&lt;embed id&gt; را در نشانی وارد کنید.</p>;
  }

  return (
    <main>
      <header style={{ padding: '12px 24px', borderBottom: '1px solid #eee' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>داشبورد فروش</h1>
      </header>
      <SupersetDashboard
        dashboardId={DASHBOARD_ID}
        supersetUrl={SUPERSET_URL}
        fetchGuestToken={fetchGuestToken}
        uiConfig={{ hideTitle: true, filters: { expanded: false } }}
        height="calc(100vh - 50px)"
      />
    </main>
  );
}
