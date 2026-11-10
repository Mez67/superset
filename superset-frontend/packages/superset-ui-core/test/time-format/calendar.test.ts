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
  createD3TimeFormatter,
  createSmartDateFormatter,
  getCalendarSystem,
  getCalendarTimeFormatLocale,
  setCalendarSystem,
  finestTemporalGrainFormatter,
} from '@superset-ui/core';

// 1403-01-01 (Nowruz) in the Jalali calendar.
const NOWRUZ_1403 = new Date(Date.UTC(2024, 2, 20));
// 1403-10-01 (1 Dey) in the Jalali calendar.
const DEY_1403 = new Date(Date.UTC(2024, 11, 21, 14, 5, 9));
// 1403-12-30, the last day of the leap year 1403.
const LAST_DAY_1403 = new Date(Date.UTC(2025, 2, 20));

const FA_LOCALE = {
  dateTime: '%x %X',
  date: '%Y/%m/%d',
  time: '%H:%M:%S',
  periods: ['ق.ظ', 'ب.ظ'] as [string, string],
  days: [
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنجشنبه',
    'جمعه',
    'شنبه',
  ] as [string, string, string, string, string, string, string],
  shortDays: ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'] as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ],
  months: Array(12).fill('ماه') as TwelveStrings,
  shortMonths: Array(12).fill('ماه') as TwelveStrings,
};
type TwelveStrings = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

afterEach(() => {
  setCalendarSystem('gregorian');
});

test('defaults to the Gregorian calendar', () => {
  expect(getCalendarSystem()).toBe('gregorian');
  expect(getCalendarTimeFormatLocale().utcFormat('%Y-%m-%d')(NOWRUZ_1403)).toBe(
    '2024-03-20',
  );
});

test('setCalendarSystem falls back to Gregorian for unknown values', () => {
  setCalendarSystem('jalali');
  expect(getCalendarSystem()).toBe('jalali');
  setCalendarSystem(undefined);
  expect(getCalendarSystem()).toBe('gregorian');
});

test.each([
  ['%Y-%m-%d', NOWRUZ_1403, '1403-01-01'],
  ['%Y/%m/%d', DEY_1403, '1403/10/01'],
  ['%Y-%m-%d', LAST_DAY_1403, '1403-12-30'],
  ['%-m/%-d/%y', DEY_1403, '10/1/03'],
  ['%e', DEY_1403, ' 1'],
  ['%j', DEY_1403, '277'],
  ['%j', LAST_DAY_1403, '366'],
  ['Q%q %Y', DEY_1403, 'Q4 1403'],
  ['%B %Y', DEY_1403, 'Dey 1403'],
  ['%d %b', NOWRUZ_1403, '01 Farvardin'],
  ['%Y-%m-%d %H:%M:%S', DEY_1403, '1403-10-01 14:05:09'],
  ['%a %d', DEY_1403, 'Sat 01'],
  ['100%% %Y', DEY_1403, '100% 1403'],
])('Jalali utcFormat(%s)', (specifier, date, expected) => {
  const { utcFormat } = getCalendarTimeFormatLocale(undefined, 'jalali');
  expect(utcFormat(specifier)(date)).toBe(expected);
});

test('uses Persian month names with a Persian d3 locale', () => {
  const { utcFormat } = getCalendarTimeFormatLocale(FA_LOCALE, 'jalali');
  expect(utcFormat('%d %B %Y')(DEY_1403)).toBe('01 دی 1403');
  expect(utcFormat('%A')(DEY_1403)).toBe('شنبه');
});

test('expands composite directives before converting', () => {
  const { utcFormat } = getCalendarTimeFormatLocale(FA_LOCALE, 'jalali');
  expect(utcFormat('%c')(DEY_1403)).toBe('1403/10/01 14:05:09');
  expect(utcFormat('%x')(DEY_1403)).toBe('1403/10/01');
});

test('local time formatting converts the local date', () => {
  const { format } = getCalendarTimeFormatLocale(undefined, 'jalali');
  const localNowruz = new Date(2024, 2, 20, 12);
  expect(format('%Y-%m-%d')(localNowruz)).toBe('1403-01-01');
});

test('createD3TimeFormatter follows the active calendar', () => {
  setCalendarSystem('jalali');
  const formatter = createD3TimeFormatter({ formatString: '%Y-%m-%d' });
  expect(formatter(NOWRUZ_1403)).toBe('1403-01-01');
});

test('smart date formatter uses Jalali month and year boundaries', () => {
  setCalendarSystem('jalali');
  const smartDate = createSmartDateFormatter();
  // First day of the Jalali year shows the year.
  expect(smartDate(NOWRUZ_1403)).toBe('1403');
  // First day of a Jalali month shows the month name.
  expect(smartDate(new Date(Date.UTC(2024, 11, 21)))).toBe('Dey');
  // 1 January is an ordinary day in the Jalali calendar.
  expect(smartDate(new Date(Date.UTC(2025, 0, 1)))).not.toBe('2025');
});

test('finest temporal grain formatter follows the active calendar', () => {
  setCalendarSystem('jalali');
  const formatter = finestTemporalGrainFormatter([NOWRUZ_1403.getTime()]);
  expect(formatter(NOWRUZ_1403)).toBe('1403-01-01');
});
