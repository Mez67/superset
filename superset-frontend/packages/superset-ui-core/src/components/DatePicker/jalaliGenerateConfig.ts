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
import type { Dayjs } from 'dayjs';
import type { GenerateConfig } from '@rc-component/picker/generate';
import dayjsGenerateConfig from '@rc-component/picker/generate/dayjs';
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';
import { JALALI_MONTHS_EN, JALALI_MONTHS_FA } from '../../time-format';

/**
 * Ant Design picker configuration for the Jalali (Solar Hijri) calendar.
 *
 * Values stay ordinary Gregorian `Dayjs` instances, so callers read and
 * submit dates exactly as with the default picker. Only what the picker
 * shows and navigates (years, months, days, month names, typed input) is
 * expressed in the Jalali calendar.
 */

type JalaliParts = { jy: number; jm: number; jd: number };

const base = dayjsGenerateConfig;

const toParts = (date: Dayjs): JalaliParts =>
  toJalaali(date.year(), date.month() + 1, date.date());

/** Move `date` to the given Jalali day, keeping its time and timezone. */
function fromParts(date: Dayjs, jy: number, jm: number, jd: number): Dayjs {
  const day = Math.min(Math.max(jd, 1), jalaaliMonthLength(jy, jm));
  const { gy, gm, gd } = toGregorian(jy, jm, day);
  // Set the day to 1 first so changing year/month never overflows.
  return date
    .date(1)
    .year(gy)
    .month(gm - 1)
    .date(gd);
}

function shiftMonths(date: Dayjs, diff: number): Dayjs {
  const { jy, jm, jd } = toParts(date);
  const total = jy * 12 + (jm - 1) + diff;
  return fromParts(date, Math.floor(total / 12), (total % 12) + 1, jd);
}

const monthNames = (locale: string) =>
  locale.toLowerCase().startsWith('fa') ? JALALI_MONTHS_FA : JALALI_MONTHS_EN;

const PERSIAN_DIGITS = /[۰-۹٠-٩]/g;
const toAsciiDigits = (text: string) =>
  text.replace(PERSIAN_DIGITS, digit =>
    String(
      '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) >= 0
        ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)
        : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit),
    ),
  );

const pad = (value: number, width: number) =>
  String(value).padStart(width, '0');

// Calendar-dependent dayjs tokens, or a bracketed literal.
const CALENDAR_TOKENS = /\[[^\]]*]|YYYY|YY|MMMM|MMM|MM|M|DD|D|Q/g;

/** Format with Jalali date tokens, delegating every other token to dayjs. */
export function formatJalali(
  locale: string,
  date: Dayjs,
  format: string,
): string {
  const { jy, jm, jd } = toParts(date);
  const names = monthNames(locale);
  const values: Record<string, string> = {
    YYYY: pad(jy, 4),
    YY: pad(jy % 100, 2),
    MMMM: names[jm - 1],
    MMM: names[jm - 1],
    MM: pad(jm, 2),
    M: String(jm),
    DD: pad(jd, 2),
    D: String(jd),
    Q: String(Math.floor((jm - 1) / 3) + 1),
  };
  const jalaliFormat = format.replace(CALENDAR_TOKENS, token =>
    token.startsWith('[') ? token : `[${values[token]}]`,
  );
  return base.locale.format(locale, date, jalaliFormat);
}

const NUMERIC_PARSERS: Record<string, string> = {
  YYYY: '(\\d{4})',
  MM: '(\\d{1,2})',
  M: '(\\d{1,2})',
  DD: '(\\d{1,2})',
  D: '(\\d{1,2})',
  HH: '(\\d{1,2})',
  H: '(\\d{1,2})',
  mm: '(\\d{1,2})',
  m: '(\\d{1,2})',
  ss: '(\\d{1,2})',
  s: '(\\d{1,2})',
};
const PARSE_TOKENS =
  /\[[^\]]*]|YYYY|MMMM|MMM|MM|M|DD|D|HH|H|mm|m|ss|s|[A-Za-z]+/g;
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse typed Jalali text (ASCII or Persian digits) against picker formats.
 * Formats using tokens other than year, month, day, hour, minute and second
 * are skipped.
 */
export function parseJalali(
  locale: string,
  text: string,
  formats: string[],
): Dayjs | null {
  const input = toAsciiDigits(text.trim());
  const names = monthNames(locale);
  for (const format of formats) {
    const tokens: string[] = [];
    let supported = true;
    let pattern = '';
    let lastIndex = 0;
    format.replace(PARSE_TOKENS, (token, offset: number) => {
      pattern += escapeRegExp(format.slice(lastIndex, offset));
      lastIndex = offset + token.length;
      if (token.startsWith('[')) {
        pattern += escapeRegExp(token.slice(1, -1));
      } else if (token === 'MMMM' || token === 'MMM') {
        tokens.push(token);
        pattern += `(${names.map(escapeRegExp).join('|')})`;
      } else if (NUMERIC_PARSERS[token]) {
        tokens.push(token);
        pattern += NUMERIC_PARSERS[token];
      } else {
        supported = false;
      }
      return token;
    });
    pattern += escapeRegExp(format.slice(lastIndex));
    const match = supported ? new RegExp(`^${pattern}$`).exec(input) : null;
    if (match) {
      const fields: Record<string, number> = {};
      tokens.forEach((token, index) => {
        const raw = match[index + 1];
        const key = token.length > 2 && token.startsWith('M') ? 'M' : token[0];
        fields[key] = token.startsWith('MMM')
          ? names.indexOf(raw) + 1
          : Number(raw);
      });
      const jy = fields.Y;
      const jm = fields.M ?? 1;
      const jd = fields.D ?? 1;
      if (
        jy !== undefined &&
        jm >= 1 &&
        jm <= 12 &&
        jd >= 1 &&
        jd <= jalaaliMonthLength(jy, jm) &&
        (fields.H ?? 0) < 24 &&
        (fields.m ?? 0) < 60 &&
        (fields.s ?? 0) < 60
      ) {
        return fromParts(base.getNow(), jy, jm, jd)
          .hour(fields.H ?? 0)
          .minute(fields.m ?? 0)
          .second(fields.s ?? 0)
          .millisecond(0);
      }
    }
  }
  return null;
}

export const jalaliGenerateConfig: GenerateConfig<Dayjs> = {
  ...base,
  getYear: date => toParts(date).jy,
  getMonth: date => toParts(date).jm - 1,
  getDate: date => toParts(date).jd,
  getEndDate: date => {
    const { jy, jm } = toParts(date);
    return fromParts(date, jy, jm, jalaaliMonthLength(jy, jm));
  },
  addYear: (date, diff) => shiftMonths(date, diff * 12),
  addMonth: (date, diff) => shiftMonths(date, diff),
  setYear: (date, year) => {
    const { jm, jd } = toParts(date);
    return fromParts(date, year, jm, jd);
  },
  setMonth: (date, month) => {
    const { jy, jd } = toParts(date);
    return fromParts(date, jy, month + 1, jd);
  },
  setDate: (date, day) => {
    const { jy, jm } = toParts(date);
    return fromParts(date, jy, jm, day);
  },
  locale: {
    ...base.locale,
    getShortMonths: locale => monthNames(locale),
    format: formatJalali,
    parse: parseJalali,
  },
};
