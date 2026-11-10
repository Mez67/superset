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
import { render, screen } from '@superset-ui/core/spec';
import { setCalendarSystem } from '../../time-format';
import { DatePicker, RangePicker } from '.';

afterEach(() => {
  setCalendarSystem('gregorian');
});

test('should render date picker', () => {
  const { container } = render(<DatePicker />);
  expect(container).toBeInTheDocument();
});

test('should render range picker', () => {
  const { container } = render(<RangePicker />);
  expect(container).toBeInTheDocument();
});

test('shows Gregorian dates by default', () => {
  render(<DatePicker value={dayjs('2024-12-21')} format="YYYY-MM-DD" />);
  expect(screen.getByDisplayValue('2024-12-21')).toBeInTheDocument();
});

test('shows Jalali dates when the Jalali calendar is active', () => {
  setCalendarSystem('jalali');
  render(<DatePicker value={dayjs('2024-12-21')} format="YYYY-MM-DD" />);
  expect(screen.getByDisplayValue('1403-10-01')).toBeInTheDocument();
});

test('range picker shows Jalali dates when the Jalali calendar is active', () => {
  setCalendarSystem('jalali');
  render(
    <RangePicker
      value={[dayjs('2024-03-20'), dayjs('2025-03-20')]}
      format="YYYY/MM/DD"
    />,
  );
  expect(screen.getByDisplayValue('1403/01/01')).toBeInTheDocument();
  expect(screen.getByDisplayValue('1403/12/30')).toBeInTheDocument();
});
