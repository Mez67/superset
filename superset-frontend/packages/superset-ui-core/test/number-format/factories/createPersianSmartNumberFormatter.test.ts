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
import {
  createD3NumberFormatter,
  createPersianSmartNumberFormatter,
  DEFAULT_D3_FORMAT,
  PERSIAN_D3_FORMAT,
} from '@superset-ui/core';

const format = createPersianSmartNumberFormatter({ locale: PERSIAN_D3_FORMAT });
const formatSigned = createPersianSmartNumberFormatter({
  signed: true,
  locale: PERSIAN_D3_FORMAT,
});

test('large values use Persian magnitude words', () => {
  expect(format(1234)).toBe('1٫23 هزار');
  expect(format(1_200_000)).toBe('1٫2 میلیون');
  expect(format(3_450_000_000)).toBe('3٫45 میلیارد');
  expect(format(7_000_000_000_000)).toBe('7 هزار میلیارد');
  expect(format(-2_500_000)).toBe('-2\u066B5 میلیون');
});

test('rounding that reaches the next magnitude moves up a unit', () => {
  expect(format(999_999)).toBe('1 میلیون');
  expect(format(999_999_999)).toBe('1 میلیارد');
});

test('small values match the default adaptive formatter', () => {
  expect(format(0)).toBe('0');
  expect(format(12.345)).toBe('12٫35');
  expect(format(0.01234)).toBe('0٫0123');
});

test('the signed variant adds a plus sign', () => {
  expect(formatSigned(1500)).toBe('+1٫5 هزار');
  expect(formatSigned(-1500)).toBe('-1٫5 هزار');
});

test('"s" formats use Persian magnitude words with a Persian locale', () => {
  const formatter = createD3NumberFormatter({
    formatString: '$,.3s',
    locale: { ...DEFAULT_D3_FORMAT, ...PERSIAN_D3_FORMAT },
  });
  expect(formatter(10_000_000)).toBe('$10٫0 میلیون');
  expect(formatter(1500)).toBe('$1٫50 هزار');
  expect(formatter(12)).toBe('$12٫0');
  // Other format types and locales are untouched.
  expect(
    createD3NumberFormatter({
      formatString: ',d',
      locale: { ...DEFAULT_D3_FORMAT, ...PERSIAN_D3_FORMAT },
    })(1234567),
  ).toBe('1٬234٬567');
  expect(createD3NumberFormatter({ formatString: '.3s' })(1500)).toBe('1.50k');
});
