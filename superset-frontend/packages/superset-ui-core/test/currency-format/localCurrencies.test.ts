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
  CurrencyFormatter,
  getCurrencySymbol,
  resolveSymbolPosition,
} from '@superset-ui/core';

test('Rial and Toman have their own symbols, placed after the value', () => {
  expect(getCurrencySymbol({ symbol: 'IRR' })).toBe('Rial');
  expect(getCurrencySymbol({ symbol: 'IRT' })).toBe('Toman');
  expect(resolveSymbolPosition('IRR')).toBe('suffix');
  expect(resolveSymbolPosition('IRT', 'prefix')).toBe('prefix');

  const formatter = new CurrencyFormatter({
    currency: { symbol: 'IRT', symbolPosition: '' },
    d3Format: ',d',
  });
  expect(formatter(1250000)).toBe('1,250,000 Toman');
});

test('other currencies are unchanged', () => {
  expect(getCurrencySymbol({ symbol: 'USD' })).toBe('$');
});
