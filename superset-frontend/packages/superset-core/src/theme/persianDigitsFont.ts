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

/*
 * "Persian Digits": Vazirmatn's Persian digits mapped to the ASCII digits 0-9,
 * one subset per weight (SIL Open Font License 1.1, see fonts/OFL.txt).
 * Regenerate the files with scripts/brand/make_digits_font.py.
 */
import w100 from './fonts/persian-digits-100.woff2';
import w200 from './fonts/persian-digits-200.woff2';
import w300 from './fonts/persian-digits-300.woff2';
import w400 from './fonts/persian-digits-400.woff2';
import w500 from './fonts/persian-digits-500.woff2';
import w600 from './fonts/persian-digits-600.woff2';
import w700 from './fonts/persian-digits-700.woff2';
import w800 from './fonts/persian-digits-800.woff2';
import w900 from './fonts/persian-digits-900.woff2';

export const PERSIAN_DIGITS_FAMILY = 'Persian Digits';

export const PERSIAN_DIGITS_FONTS: Record<number, string> = {
  100: w100,
  200: w200,
  300: w300,
  400: w400,
  500: w500,
  600: w600,
  700: w700,
  800: w800,
  900: w900,
};
