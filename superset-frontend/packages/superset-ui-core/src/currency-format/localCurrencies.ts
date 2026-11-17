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
import { t } from '@apache-superset/core/translation';
import type { SymbolPosition } from './symbolPosition';

/**
 * Currencies whose symbol Intl does not provide in a useful form. "IRT"
 * (Toman, 10 rials) is not an ISO 4217 code but is how prices are quoted in
 * Iran; values are shown as they are, without converting from rials.
 */
const LOCAL_CURRENCIES: Record<
  string,
  { symbol: () => string; position: SymbolPosition }
> = {
  IRR: { symbol: () => t('Rial'), position: 'suffix' },
  IRT: { symbol: () => t('Toman'), position: 'suffix' },
};

export function getLocalCurrencySymbol(code?: string): string | undefined {
  return code ? LOCAL_CURRENCIES[code]?.symbol() : undefined;
}

export function getLocalCurrencyPosition(
  code?: string,
): SymbolPosition | undefined {
  return code ? LOCAL_CURRENCIES[code]?.position : undefined;
}
