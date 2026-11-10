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
import createCache, { type EmotionCache } from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

export type TextDirection = 'ltr' | 'rtl';

/**
 * Text direction of the current document.
 *
 * The server renders `<html dir="rtl">` for right-to-left locales (see
 * `RTL_LANGUAGES` in `superset/config.py`), so the root element's `dir`
 * attribute is the single source of truth for the UI direction.
 */
export function getDocumentDirection(): TextDirection {
  if (typeof document === 'undefined') {
    return 'ltr';
  }
  return document.documentElement?.getAttribute('dir')?.toLowerCase() === 'rtl'
    ? 'rtl'
    : 'ltr';
}

/**
 * Create the Emotion cache used by Superset's theme provider.
 *
 * In RTL documents, styles are passed through `stylis-plugin-rtl`, which
 * mirrors physical properties (`margin-left`, `left`, `text-align: left`,
 * etc.) so that existing styled components lay out correctly without
 * per-component changes. Styles that must not be mirrored should live
 * outside Emotion (inline styles or third-party stylesheets are untouched);
 * `@noflip` comments are not reliable because the build strips comments.
 */
export function createSupersetEmotionCache(
  direction: TextDirection = getDocumentDirection(),
): EmotionCache {
  if (direction === 'rtl') {
    return createCache({
      key: 'superset-rtl',
      stylisPlugins: [prefixer, rtlPlugin],
    });
  }
  return createCache({ key: 'superset' });
}
