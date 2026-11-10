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
  getJalaliBoundaryTicks,
  getNextJalaliBucketStart,
  isJalaliGrain,
  createTimeRangeFromGranularity,
  TimeGranularity,
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

test.each([
  // 1 Dey 1403 -> 1 Bahman 1403
  ['JALALI_MONTH', Date.UTC(2024, 11, 21), Date.UTC(2025, 0, 20)],
  // 1 Dey 1403 (Q4) -> Nowruz 1404
  ['JALALI_QUARTER', Date.UTC(2024, 11, 21), Date.UTC(2025, 2, 21)],
  // Nowruz 1403 -> Nowruz 1404, across the 30-day Esfand of a leap year
  ['JALALI_YEAR', Date.UTC(2024, 2, 20), Date.UTC(2025, 2, 21)],
  // 1 Esfand 1403 -> Nowruz 1404 rolls the year over
  ['JALALI_MONTH', Date.UTC(2025, 1, 19), Date.UTC(2025, 2, 21)],
])('getNextJalaliBucketStart(%s)', (grain, start, expected) => {
  expect(getNextJalaliBucketStart(new Date(start), grain)?.getTime()).toBe(
    expected,
  );
});

test('getNextJalaliBucketStart ignores non-Jalali grains', () => {
  expect(getNextJalaliBucketStart(NOWRUZ_1403, 'P1M')).toBeUndefined();
  expect(isJalaliGrain('JALALI_MONTH')).toBe(true);
  expect(isJalaliGrain('P1M')).toBe(false);
  expect(isJalaliGrain(undefined)).toBe(false);
});

test('createTimeRangeFromGranularity spans a whole Jalali month', () => {
  const [start, end] = createTimeRangeFromGranularity(
    new Date(Date.UTC(2024, 11, 21)),
    TimeGranularity.JALALI_MONTH,
  );
  expect(start.toISOString()).toBe('2024-12-21T00:00:00.000Z');
  expect(end.toISOString()).toBe('2025-01-19T23:59:59.999Z');
});

const isoDays = (ticks?: number[]) =>
  ticks?.map(tick => new Date(tick).toISOString().slice(0, 10));

test('getJalaliBoundaryTicks ticks on Jalali month starts', () => {
  // 10 Dey 1403 .. 15 Farvardin 1404
  expect(
    isoDays(
      getJalaliBoundaryTicks(Date.UTC(2024, 11, 30), Date.UTC(2025, 3, 4)),
    ),
  ).toEqual(['2025-01-20', '2025-02-19', '2025-03-21']);
});

test('getJalaliBoundaryTicks steps up to quarters and years on long ranges', () => {
  // Two Jalali years: too many months, so quarter starts.
  const quarters = isoDays(
    getJalaliBoundaryTicks(Date.UTC(2023, 2, 21), Date.UTC(2025, 2, 20)),
  );
  expect(quarters?.[0]).toBe('2023-03-21');
  expect(quarters).toContain('2024-03-20');
  expect(quarters).toHaveLength(8);
  // Twenty years: Nowruz every other year at most 12 ticks.
  const years = getJalaliBoundaryTicks(
    Date.UTC(2005, 0, 1),
    Date.UTC(2025, 0, 1),
  );
  expect(years!.length).toBeLessThanOrEqual(12);
  expect(
    isoDays(years)?.every(
      day => day.slice(5) === '03-21' || day.slice(5) === '03-20',
    ),
  ).toBe(true);
});

test('getJalaliBoundaryTicks leaves short ranges to day ticks', () => {
  expect(
    getJalaliBoundaryTicks(Date.UTC(2025, 0, 1), Date.UTC(2025, 0, 25)),
  ).toBeUndefined();
  expect(getJalaliBoundaryTicks(5, 5)).toBeUndefined();
});
