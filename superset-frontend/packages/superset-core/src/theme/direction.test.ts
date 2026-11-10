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
import { serializeStyles } from '@emotion/serialize';
import { createSupersetEmotionCache, getDocumentDirection } from './direction';

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

const renderRule = (cssText: string, direction: 'ltr' | 'rtl'): string => {
  const cache = createSupersetEmotionCache(direction);
  const serialized = serializeStyles([cssText], cache.registered);
  const rules: string[] = [];
  cache.sheet.insert = (rule: string) => {
    rules.push(rule);
  };
  cache.insert(
    `.${cache.key}-${serialized.name}`,
    serialized,
    cache.sheet,
    true,
  );
  return rules.join('');
};

test('getDocumentDirection defaults to ltr', () => {
  expect(getDocumentDirection()).toBe('ltr');
});

test('getDocumentDirection reads the dir attribute of the html element', () => {
  document.documentElement.setAttribute('dir', 'rtl');
  expect(getDocumentDirection()).toBe('rtl');
});

test('getDocumentDirection ignores unknown values', () => {
  document.documentElement.setAttribute('dir', 'auto');
  expect(getDocumentDirection()).toBe('ltr');
});

test('createSupersetEmotionCache uses distinct keys per direction', () => {
  expect(createSupersetEmotionCache('ltr').key).toBe('superset');
  expect(createSupersetEmotionCache('rtl').key).toBe('superset-rtl');
});

test('RTL cache mirrors physical properties', () => {
  const rule = renderRule('margin-left: 4px; text-align: left;', 'rtl');
  expect(rule).toContain('margin-right:4px');
  expect(rule).toContain('text-align:right');
  expect(rule).not.toContain('margin-left');
});

test('LTR cache leaves physical properties untouched', () => {
  const rule = renderRule('margin-left: 4px;', 'ltr');
  expect(rule).toContain('margin-left:4px');
});
