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
import { render, screen } from 'spec/helpers/testing-library';
import getBootstrapData from 'src/utils/getBootstrapData';
import WelcomeHero from './WelcomeHero';

jest.mock('src/utils/getBootstrapData', () => ({
  __esModule: true,
  default: jest.fn(() => ({ user: {}, common: {} })),
}));

const mockUser = (user: Record<string, unknown>) =>
  (getBootstrapData as jest.Mock).mockReturnValue({ user, common: {} });

afterEach(() => {
  jest.useRealTimers();
});

test('greets the user by first name for the time of day', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 9, 0));
  mockUser({ firstName: 'Sara', roles: {} });
  render(<WelcomeHero />);
  expect(screen.getByText('Good morning, Sara')).toBeInTheDocument();
});

test('shows only the shortcuts the user is allowed to use', () => {
  mockUser({
    firstName: 'Sara',
    roles: {
      Gamma: [
        ['can_write', 'Chart'],
        ['can_read', 'Dataset'],
      ],
    },
  });
  render(<WelcomeHero />);
  expect(screen.getByTestId('welcome-action-chart')).toHaveAttribute(
    'href',
    '/chart/add',
  );
  expect(screen.getByTestId('welcome-action-datasets')).toBeInTheDocument();
  expect(screen.queryByTestId('welcome-action-dashboard')).toBeNull();
  expect(screen.queryByTestId('welcome-action-sqllab')).toBeNull();
});

test('renders the greeting without shortcuts for a user without permissions', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 20, 0));
  mockUser({ firstName: '', roles: {} });
  render(<WelcomeHero />);
  expect(screen.getByText('Good evening')).toBeInTheDocument();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});
