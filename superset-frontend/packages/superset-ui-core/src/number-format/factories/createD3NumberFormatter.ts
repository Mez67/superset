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
  formatLocale,
  formatSpecifier,
  FormatLocaleDefinition,
} from 'd3-format';
import { isRequired } from '../../utils';
import NumberFormatter from '../NumberFormatter';
import { NumberFormatFunction } from '../types';
import { DEFAULT_D3_FORMAT } from '../D3FormatConfig';

/**
 * A locale may carry ``siUnits`` (not part of d3-format): words that replace
 * the SI prefixes of "s" formats, e.g. Persian "1.2 میلیون" for "1.2M".
 */
type LocaleWithSiUnits = FormatLocaleDefinition & {
  siUnits?: Record<string, string>;
};

function withSiUnits(
  format: (value: number) => string,
  formatString: string,
  locale?: LocaleWithSiUnits,
): NumberFormatFunction {
  const units = locale?.siUnits;
  if (!units || formatSpecifier(formatString).type !== 's') {
    return format;
  }
  const prefixes = Object.keys(units).join('');
  const pattern = new RegExp(`(\\d)([${prefixes}])(?=\\D*$)`);
  return value =>
    format(value).replace(
      pattern,
      (_, digit, prefix) => `${digit} ${units[prefix]}`,
    );
}

export default function createD3NumberFormatter(config: {
  description?: string;
  formatString: string;
  label?: string;
  locale?: FormatLocaleDefinition;
}) {
  const {
    description,
    formatString = isRequired('config.formatString'),
    label,
    locale,
  } = config;

  let formatFunc: NumberFormatFunction;
  let isInvalid = false;

  try {
    formatFunc = withSiUnits(
      formatLocale(locale ?? DEFAULT_D3_FORMAT).format(formatString),
      formatString,
      locale,
    );
  } catch (error) {
    formatFunc = value => `${value} (Invalid format: ${formatString})`;
    isInvalid = true;
  }

  return new NumberFormatter({
    description,
    formatFunc,
    id: formatString,
    isInvalid,
    label,
  });
}
