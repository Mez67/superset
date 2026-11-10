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

import { timeFormat, timeFormatLocale, utcFormat } from 'd3-time-format';
import type { TimeLocaleDefinition } from 'd3-time-format';
import { toGregorian, toJalaali } from 'jalaali-js';

/**
 * Calendar systems supported when formatting dates.
 *
 * - `gregorian`: the default d3 behaviour.
 * - `jalali`: the Solar Hijri (Persian) calendar. Year, month, day, day of
 *   year and quarter are converted; times and weekdays are unchanged.
 */
export type CalendarSystem = 'gregorian' | 'jalali';

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_MONTHS_EN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
];

let activeCalendar: CalendarSystem = 'gregorian';

export function setCalendarSystem(calendar: CalendarSystem | undefined | null) {
  activeCalendar = calendar === 'jalali' ? 'jalali' : 'gregorian';
}

export function getCalendarSystem(): CalendarSystem {
  return activeCalendar;
}

type DateFormatter = (date: Date) => string;
type FormatFactory = (specifier: string) => DateFormatter;

export interface CalendarTimeFormatLocale {
  format: FormatFactory;
  utcFormat: FormatFactory;
}

const ARABIC_SCRIPT = /[؀-ۿ]/;
// Cumulative day counts at the start of each Jalali month.
const JALALI_MONTH_OFFSETS = [
  0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336,
];
const JALALI_DIRECTIVES = new Set([
  'Y',
  'y',
  'm',
  'd',
  'e',
  'B',
  'b',
  'j',
  'q',
]);
const DEFAULT_PADS: Record<string, string> = {
  d: '0',
  e: ' ',
  j: '0',
  m: '0',
  y: '0',
  Y: '0',
};
const PAD_CHARS: Record<string, string> = { '-': '', _: ' ', '0': '0' };

/** Jalali year, month (1-12) and day of a date, in UTC or local time. */
export function toJalaliParts(
  date: Date,
  useUtc: boolean,
): { jy: number; jm: number; jd: number } {
  return useUtc
    ? toJalaali(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      )
    : toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Number of Jalali months in each Jalali time grain. */
export const JALALI_GRAIN_MONTHS: Record<string, number> = {
  JALALI_MONTH: 1,
  JALALI_QUARTER: 3,
  JALALI_YEAR: 12,
};

export const isJalaliGrain = (granularity?: string | null): boolean =>
  !!granularity && granularity in JALALI_GRAIN_MONTHS;

/**
 * Start of the Jalali bucket following the one that starts at `start`.
 *
 * `start` is the value a Jalali time grain produces (the first day of a
 * Jalali month, quarter or year, at midnight). Returns `undefined` for
 * grains that are not Jalali.
 */
export function getNextJalaliBucketStart(
  start: Date,
  granularity: string,
  useUtc = true,
): Date | undefined {
  const months = JALALI_GRAIN_MONTHS[granularity];
  if (!months) {
    return undefined;
  }
  const { jy, jm } = toJalaliParts(start, useUtc);
  const total = jy * 12 + (jm - 1) + months;
  const { gy, gm, gd } = toGregorian(
    Math.floor(total / 12),
    (total % 12) + 1,
    1,
  );
  return useUtc ? new Date(Date.UTC(gy, gm - 1, gd)) : new Date(gy, gm - 1, gd);
}

/**
 * Timestamps of Jalali calendar boundaries within `[min, max]`, for pinning
 * the ticks of a time axis so they fall on Jalali months, quarters or years
 * rather than Gregorian ones.
 *
 * Uses the finest step that yields at most `maxTicks` ticks: months, then
 * quarters, then years, then every n years. Returns `undefined` when the
 * range spans fewer than two month boundaries, where day-based ticks (which
 * are the same in both calendars) are more useful.
 */
export function getJalaliBoundaryTicks(
  min: number,
  max: number,
  maxTicks = 12,
  useUtc = true,
): number[] | undefined {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return undefined;
  }
  const { jy, jm, jd } = toJalaliParts(new Date(min), useUtc);
  const toTime = (monthIndex: number) => {
    const { gy, gm, gd } = toGregorian(
      Math.floor(monthIndex / 12),
      (monthIndex % 12) + 1,
      1,
    );
    return useUtc
      ? Date.UTC(gy, gm - 1, gd)
      : new Date(gy, gm - 1, gd).getTime();
  };
  // First Jalali month start on or after `min`.
  let first = jy * 12 + (jm - 1);
  if (jd !== 1 || toTime(first) < min) {
    first += 1;
  }
  const months: number[] = [];
  for (let index = first; toTime(index) <= max; index += 1) {
    months.push(index);
  }
  if (months.length < 2) {
    return undefined;
  }
  const steps = [1, 3, 12];
  let step = steps.find(
    size => months.filter(index => index % size === 0).length <= maxTicks,
  );
  if (step === undefined) {
    const years = Math.ceil(months.length / 12);
    step = 12 * Math.ceil(years / maxTicks);
  }
  const ticks = months.filter(index => index % step! === 0).map(toTime);
  return ticks.length ? ticks : undefined;
}

function pad(value: number, padChar: string, width: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(value));
  if (!padChar || digits.length >= width) {
    return sign + digits;
  }
  return sign + padChar.repeat(width - digits.length) + digits;
}

/**
 * Expand the composite directives %c, %x and %X into their locale patterns
 * so their date parts can be converted to the Jalali calendar.
 */
function expandComposites(
  specifier: string,
  locale: TimeLocaleDefinition,
): string {
  let expanded = specifier;
  for (let i = 0; i < 3 && /%[cxX]/.test(expanded); i += 1) {
    expanded = expanded
      .replace(/%c/g, locale.dateTime)
      .replace(/%x/g, locale.date)
      .replace(/%X/g, locale.time);
  }
  return expanded;
}

function createJalaliFormat(
  baseFactory: FormatFactory,
  locale: TimeLocaleDefinition,
  useUtc: boolean,
): FormatFactory {
  const monthNames = ARABIC_SCRIPT.test(locale.months.join(''))
    ? JALALI_MONTHS_FA
    : JALALI_MONTHS_EN;

  return (rawSpecifier: string) => {
    const specifier = expandComposites(rawSpecifier, locale);
    // Split the specifier into literal text and directives, compiling
    // non-calendar directives with the regular d3 formatter.
    const parts: (
      | string
      | { directive: string; padChar?: string; format?: DateFormatter }
    )[] = [];
    let literal = '';
    for (let i = 0; i < specifier.length; i += 1) {
      const char = specifier[i];
      if (char !== '%' || i === specifier.length - 1) {
        literal += char;
        continue;
      }
      let directive = specifier[i + 1];
      let padChar: string | undefined;
      let token = `%${directive}`;
      if (directive in PAD_CHARS && i + 2 < specifier.length) {
        padChar = PAD_CHARS[directive];
        directive = specifier[i + 2];
        token = `%${specifier[i + 1]}${directive}`;
        i += 1;
      }
      i += 1;
      if (literal) {
        parts.push(literal);
        literal = '';
      }
      parts.push(
        JALALI_DIRECTIVES.has(directive)
          ? { directive, padChar }
          : { directive, format: baseFactory(token) },
      );
    }
    if (literal) {
      parts.push(literal);
    }

    return (date: Date) => {
      const { jy, jm, jd } = toJalaliParts(date, useUtc);
      return parts
        .map(part => {
          if (typeof part === 'string') {
            return part;
          }
          if (part.format) {
            return part.format(date);
          }
          const padChar = part.padChar ?? DEFAULT_PADS[part.directive] ?? '';
          switch (part.directive) {
            case 'Y':
              return pad(jy, padChar, 4);
            case 'y':
              return pad(jy % 100, padChar, 2);
            case 'm':
              return pad(jm, padChar, 2);
            case 'd':
            case 'e':
              return pad(jd, padChar, 2);
            case 'B':
            case 'b':
              return monthNames[jm - 1];
            case 'j':
              return pad(JALALI_MONTH_OFFSETS[jm - 1] + jd, padChar, 3);
            case 'q':
              return String(Math.floor((jm - 1) / 3) + 1);
            default:
              return '';
          }
        })
        .join('');
    };
  };
}

/**
 * Return d3-style `format` / `utcFormat` factories for the active calendar.
 *
 * With the Gregorian calendar this is exactly d3's behaviour. With the
 * Jalali calendar, calendar-dependent directives are converted while the
 * rest of the specifier is delegated to d3.
 */
export function getCalendarTimeFormatLocale(
  locale?: TimeLocaleDefinition,
  calendar: CalendarSystem = activeCalendar,
): CalendarTimeFormatLocale {
  const d3Locale = locale
    ? timeFormatLocale(locale)
    : { format: timeFormat, utcFormat };
  if (calendar !== 'jalali') {
    return d3Locale;
  }
  const definition: TimeLocaleDefinition = locale ?? {
    dateTime: '%x, %X',
    date: '%-m/%-d/%Y',
    time: '%-I:%M:%S %p',
    periods: ['AM', 'PM'],
    days: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: [...JALALI_MONTHS_EN] as TimeLocaleDefinition['months'],
    shortMonths: [...JALALI_MONTHS_EN] as TimeLocaleDefinition['shortMonths'],
  };
  return {
    format: createJalaliFormat(d3Locale.format, definition, false),
    utcFormat: createJalaliFormat(d3Locale.utcFormat, definition, true),
  };
}
