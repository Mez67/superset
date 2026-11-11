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
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  embedDashboard,
  type EmbeddedDashboard,
  type UiConfigType,
} from '@superset-ui/embedded-sdk';

export interface SupersetDashboardProps {
  /** Embed id from the dashboard's "Embed dashboard" dialog in Superset. */
  dashboardId: string;
  /** Superset's address, e.g. "https://bi.example.com". */
  supersetUrl: string;
  /**
   * Returns a guest token from your own backend. Never create guest tokens
   * in the browser: that needs Superset credentials.
   */
  fetchGuestToken: () => Promise<string>;
  /** What to show of Superset's dashboard chrome. */
  uiConfig?: UiConfigType;
  /** Height of the dashboard area. Defaults to the full viewport height. */
  height?: CSSProperties['height'];
  className?: string;
  /** Called once the dashboard is mounted, e.g. to read its state. */
  onReady?: (dashboard: EmbeddedDashboard) => void;
}

/**
 * Renders a Superset dashboard inside the host React app.
 *
 * Language, text direction and calendar follow the Superset server's
 * configuration, so a Persian Superset embeds right-to-left with Jalali
 * dates.
 */
export default function SupersetDashboard({
  dashboardId,
  supersetUrl,
  fetchGuestToken,
  uiConfig,
  height = '100vh',
  className,
  onReady,
}: SupersetDashboardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callbacks without re-embedding on every render.
  const tokenRef = useRef(fetchGuestToken);
  const readyRef = useRef(onReady);
  tokenRef.current = fetchGuestToken;
  readyRef.current = onReady;
  const uiConfigKey = JSON.stringify(uiConfig ?? {});

  useEffect(() => {
    const mountPoint = mountRef.current;
    if (!mountPoint) return undefined;
    let embedded: EmbeddedDashboard | undefined;
    let cancelled = false;
    setError(null);

    embedDashboard({
      id: dashboardId,
      supersetDomain: supersetUrl,
      mountPoint,
      fetchGuestToken: () => tokenRef.current(),
      dashboardUiConfig: JSON.parse(uiConfigKey) as UiConfigType,
      iframeTitle: 'Superset dashboard',
    })
      .then(dashboard => {
        if (cancelled) {
          dashboard.unmount();
          return;
        }
        embedded = dashboard;
        // The SDK does not size its iframe; fill the mount point.
        const iframe = mountPoint.querySelector('iframe');
        if (iframe) {
          Object.assign(iframe.style, { width: '100%', height: '100%', border: '0' });
        }
        readyRef.current?.(dashboard);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      embedded?.unmount();
    };
  }, [dashboardId, supersetUrl, uiConfigKey]);

  return (
    <div className={className} style={{ height, position: 'relative' }}>
      {error && (
        <div role="alert" style={{ padding: 16, color: '#b42318' }}>
          {error}
        </div>
      )}
      <div ref={mountRef} className="superset-dashboard-mount" style={{ height: '100%' }} />
    </div>
  );
}
