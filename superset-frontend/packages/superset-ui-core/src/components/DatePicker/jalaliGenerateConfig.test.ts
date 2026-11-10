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
import dayjs from 'dayjs';
import {
  formatJalali,
  jalaliGenerateConfig as config,
  parseJalali,
} from './jalaliGenerateConfig';

// 2024-12-21 is 1 Dey 1403.
const DEY_1 = dayjs('2024-12-21T10:30:00');
// 2025-03-20 is 30 Esfand 1403 (1403 is a leap year).
const ESFAND_30 = dayjs('2025-03-20T00:00:00');

test('reads Jalali year, month and day', () => {
  expect(config.getYear(DEY_1)).toBe(1403);
  expect(config.getMonth(DEY_1)).toBe(9);
  expect(config.getDate(DEY_1)).toBe(1);
});

test('values stay Gregorian dayjs instances', () => {
  const next = config.addMonth(DEY_1, 1);
  expect(next.format('YYYY-MM-DD HH:mm')).toBe('2025-01-20 10:30');
});

test('month and year arithmetic follows the Jalali calendar', () => {
  expect(config.addMonth(DEY_1, 3).format('YYYY-MM-DD')).toBe('2025-03-21');
  expect(config.addMonth(DEY_1, -10).format('YYYY-MM-DD')).toBe('2024-02-20');
  expect(config.addYear(ESFAND_30, 1).format('YYYY-MM-DD')).toBe('2026-03-20');
});

test('clamps the day when moving to a shorter month', () => {
  // 31 Shahrivar 1403 -> Mehr has 30 days.
  const shahrivar31 = dayjs('2024-09-21');
  expect(config.getDate(shahrivar31)).toBe(31);
  const mehr = config.addMonth(shahrivar31, 1);
  expect([config.getMonth(mehr), config.getDate(mehr)]).toEqual([6, 30]);
});

test('setters use Jalali fields', () => {
  expect(config.setDate(DEY_1, 15).format('YYYY-MM-DD')).toBe('2025-01-04');
  expect(config.setMonth(DEY_1, 0).format('YYYY-MM-DD')).toBe('2024-03-20');
  expect(config.setYear(DEY_1, 1404).format('YYYY-MM-DD')).toBe('2025-12-22');
});

test('getEndDate returns the last day of the Jalali month', () => {
  expect(config.getEndDate(DEY_1).format('YYYY-MM-DD')).toBe('2025-01-19');
  expect(config.getEndDate(ESFAND_30).format('YYYY-MM-DD')).toBe('2025-03-20');
});

test('formats Jalali tokens and delegates the rest to dayjs', () => {
  expect(formatJalali('en', DEY_1, 'YYYY-MM-DD HH:mm')).toBe(
    '1403-10-01 10:30',
  );
  expect(formatJalali('fa', DEY_1, 'D MMMM YYYY')).toBe('1 دی 1403');
  expect(formatJalali('en', DEY_1, 'MMM')).toBe('Dey');
  expect(formatJalali('en', DEY_1, 'YYYY-[Q]Q')).toBe('1403-Q4');
});

test('short month names follow the locale', () => {
  expect(config.locale.getShortMonths?.('fa_IR')[0]).toBe('فروردین');
  expect(config.locale.getShortMonths?.('en_US')[11]).toBe('Esfand');
});

test('parses typed Jalali dates, including Persian digits', () => {
  expect(
    parseJalali('fa', '1403-10-01', ['YYYY-MM-DD'])?.format('YYYY-MM-DD'),
  ).toBe('2024-12-21');
  expect(
    parseJalali('fa', '۱۴۰۳/۱۲/۳۰', ['YYYY/MM/DD'])?.format('YYYY-MM-DD'),
  ).toBe('2025-03-20');
  expect(
    parseJalali('fa', '1403-10-01 08:15:30', ['YYYY-MM-DD HH:mm:ss'])?.format(
      'YYYY-MM-DD HH:mm:ss',
    ),
  ).toBe('2024-12-21 08:15:30');
});

test('rejects invalid Jalali dates and unsupported formats', () => {
  // 1404 is not a leap year: Esfand has 29 days.
  expect(parseJalali('fa', '1404-12-30', ['YYYY-MM-DD'])).toBeNull();
  expect(parseJalali('fa', '1403-13-01', ['YYYY-MM-DD'])).toBeNull();
  expect(parseJalali('fa', '1403-W10', ['YYYY-wo'])).toBeNull();
  expect(parseJalali('fa', 'hello', ['YYYY-MM-DD'])).toBeNull();
});

test('round-trips format and parse', () => {
  const text = formatJalali('fa', DEY_1, 'YYYY-MM-DD');
  expect(parseJalali('fa', text, ['YYYY-MM-DD'])?.format('YYYY-MM-DD')).toBe(
    '2024-12-21',
  );
});
