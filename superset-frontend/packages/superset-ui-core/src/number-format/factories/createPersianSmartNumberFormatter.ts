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
import { formatLocale, FormatLocaleDefinition } from 'd3-format';
import NumberFormatter from '../NumberFormatter';
import NumberFormats from '../NumberFormats';
import { DEFAULT_D3_FORMAT } from '../D3FormatConfig';

/**
 * Persian number separators: U+066B (decimal) and U+066C (thousands).
 */
export const PERSIAN_D3_FORMAT: Partial<FormatLocaleDefinition> & {
  siUnits: Record<string, string>;
} = {
  decimal: '\u066B',
  thousands: '\u066C',
  // "s" formats (e.g. ".3s"): 1.2M -> 1.2 میلیون. See createD3NumberFormatter.
  siUnits: { k: 'هزار', M: 'میلیون', G: 'میلیارد', T: 'هزار میلیارد' },
};

/**
 * Magnitudes as Iranians read them. 10^12 is said "هزار میلیارد".
 */
const PERSIAN_UNITS: [number, string][] = [
  [1e12, 'هزار میلیارد'],
  [1e9, 'میلیارد'],
  [1e6, 'میلیون'],
  [1e3, 'هزار'],
];

/**
 * The adaptive formatter (SMART_NUMBER) for Persian: large values read
 * "1.2 میلیون" instead of "1.2M"; smaller values match the default one.
 */
export default function createPersianSmartNumberFormatter(
  config: {
    signed?: boolean;
    locale?: Partial<FormatLocaleDefinition>;
  } = {},
) {
  const { signed = false, locale } = config;
  const d3Locale = formatLocale({ ...DEFAULT_D3_FORMAT, ...locale });
  const significant = d3Locale.format('.3~r');
  const float2 = d3Locale.format('.2~f');
  const float4 = d3Locale.format('.4~f');
  const tiny = d3Locale.format('.3~s');

  const formatValue = (value: number): string => {
    if (value === 0) {
      return '0';
    }
    const absolute = Math.abs(value);
    for (let i = 0; i < PERSIAN_UNITS.length; i += 1) {
      const [size, name] = PERSIAN_UNITS[i];
      if (absolute >= size) {
        // Rounding can reach the next unit (999,999 -> 1000 هزار).
        const scaled = Number((value / size).toPrecision(3));
        if (Math.abs(scaled) >= 1000 && i > 0) {
          const [biggerSize, biggerName] = PERSIAN_UNITS[i - 1];
          return `${significant(value / biggerSize)} ${biggerName}`;
        }
        return `${significant(scaled)} ${name}`;
      }
    }
    if (absolute >= 1) {
      return float2(value);
    }
    if (absolute >= 0.001) {
      return float4(value);
    }
    return tiny(value);
  };

  return new NumberFormatter({
    formatFunc: value =>
      `${signed && value > 0 ? '+' : ''}${formatValue(value)}`,
    id: signed ? NumberFormats.SMART_NUMBER_SIGNED : NumberFormats.SMART_NUMBER,
    label: 'Adaptive formatter',
  });
}
