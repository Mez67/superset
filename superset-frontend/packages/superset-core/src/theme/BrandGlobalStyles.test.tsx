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
import { render } from '@testing-library/react';
import { Theme } from './Theme';

// Emotion inserts rules via the CSSOM, so read them from document.styleSheets.
function ruleTexts(): string[] {
  const texts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      Array.from(sheet.cssRules).forEach(rule => texts.push(rule.cssText));
    } catch {
      // cross-origin sheets are not readable
    }
  }
  return texts;
}

test('brand styles are mounted with every Superset theme and follow its tokens', () => {
  const themeObject = Theme.fromConfig({
    token: { colorBgLayout: '#123456', colorPrimary: '#3b5bdb' },
  });
  render(
    <themeObject.SupersetThemeProvider>
      <div />
    </themeObject.SupersetThemeProvider>,
  );
  const rules = ruleTexts();

  expect(
    rules.some(
      r => r.startsWith('body') && /background-color:\s*#123456/i.test(r),
    ),
  ).toBe(true);
  expect(rules.some(r => r.includes('#main-menu'))).toBe(true);
  expect(
    rules.some(
      r =>
        r.includes("[data-test='login-form']") ||
        r.includes('[data-test="login-form"]'),
    ),
  ).toBe(true);
  expect(rules.some(r => r.includes('.welcome-sections'))).toBe(true);
});
