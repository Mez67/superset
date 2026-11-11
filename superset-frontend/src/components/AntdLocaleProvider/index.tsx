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
import { useEffect, useState, type ReactNode } from 'react';
// eslint-disable-next-line no-restricted-imports
import { ConfigProvider } from 'antd';
// eslint-disable-next-line no-restricted-imports
import type { Locale } from 'antd/es/locale';
import { LOCALE_MAPPING } from 'src/hooks/useLocale';
import getBootstrapData from 'src/utils/getBootstrapData';

/**
 * Applies the Ant Design locale matching the user's language to the whole
 * app, so texts built into Ant Design components (pagination, empty states,
 * table filters, date pickers, modal buttons, ...) are translated too.
 * English keeps Ant Design's built-in English texts.
 */
export default function AntdLocaleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const language = getBootstrapData().common.locale;
  const loader = LOCALE_MAPPING[language as keyof typeof LOCALE_MAPPING];
  const [locale, setLocale] = useState<Locale | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (loader && language !== 'en') {
      loader()
        .then(module => {
          if (active) setLocale(module.default);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [loader, language]);

  // Always render the provider so the subtree is not remounted once the
  // locale finishes loading; until then Ant Design uses its default.
  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
}
