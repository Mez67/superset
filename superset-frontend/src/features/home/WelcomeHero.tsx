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
import type { ReactNode } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Icons } from '@superset-ui/core/components';
import getBootstrapData from 'src/utils/getBootstrapData';
import { findPermission } from 'src/utils/findPermission';

const Hero = styled.section`
  ${({ theme }) => css`
    margin: ${theme.marginLG}px ${theme.marginLG}px 0;
    padding: ${theme.paddingLG}px ${theme.paddingXL}px;
    border-radius: ${theme.borderRadiusLG}px;
    border: 1px solid ${theme.colorBorderSecondary};
    background:
      radial-gradient(
        circle at 100% 0,
        ${theme.colorPrimaryBg} 0,
        transparent 55%
      ),
      ${theme.colorBgContainer};
    box-shadow: ${theme.boxShadowTertiary};
  `}
`;

const Greeting = styled.h2`
  ${({ theme }) => css`
    margin: 0;
    font-size: ${theme.fontSizeHeading3}px;
    font-weight: ${theme.fontWeightStrong};
    color: ${theme.colorText};
  `}
`;

const Subtitle = styled.p`
  ${({ theme }) => css`
    margin: ${theme.marginXS}px 0 ${theme.marginLG}px;
    color: ${theme.colorTextSecondary};
    font-size: ${theme.fontSize}px;
  `}
`;

const Actions = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: ${theme.margin}px;
  `}
`;

const Action = styled.a`
  ${({ theme }) => css`
    display: flex;
    align-items: flex-start;
    gap: ${theme.marginSM}px;
    padding: ${theme.padding}px;
    border-radius: ${theme.borderRadiusLG}px;
    border: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorBgContainer};
    color: ${theme.colorText};
    transition:
      border-color ${theme.motionDurationMid},
      box-shadow ${theme.motionDurationMid},
      transform ${theme.motionDurationMid};

    &:hover {
      color: ${theme.colorText};
      border-color: ${theme.colorPrimaryBorder};
      box-shadow: ${theme.boxShadowSecondary};
      transform: translateY(-2px);
    }

    .welcome-action-icon {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: ${theme.borderRadius}px;
      background: ${theme.colorPrimaryBg};
      color: ${theme.colorPrimary};
      font-size: 20px;
    }

    .welcome-action-title {
      display: block;
      font-weight: ${theme.fontWeightStrong};
      margin-bottom: 2px;
    }

    .welcome-action-description {
      display: block;
      color: ${theme.colorTextSecondary};
      font-size: ${theme.fontSizeSM}px;
      line-height: 1.6;
    }
  `}
`;

interface WelcomeAction {
  key: string;
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  allowed: boolean;
}

const greetingFor = (hour: number, name: string) => {
  if (hour < 12) return name ? t('Good morning, %s', name) : t('Good morning');
  if (hour < 18)
    return name ? t('Good afternoon, %s', name) : t('Good afternoon');
  return name ? t('Good evening, %s', name) : t('Good evening');
};

/**
 * Greeting and shortcuts to the most common starting points, shown above
 * the home page sections (registered as the `welcome.banner` extension).
 */
export default function WelcomeHero() {
  const { user } = getBootstrapData();
  const roles = user && 'roles' in user ? user.roles : undefined;
  const name = (user && 'firstName' in user && user.firstName) || '';

  const actions: WelcomeAction[] = [
    {
      key: 'dashboard',
      href: '/dashboard/new/',
      icon: <Icons.DashboardOutlined iconSize="xl" />,
      title: t('New dashboard'),
      description: t('Arrange charts and filters on one page'),
      allowed: findPermission('can_write', 'Dashboard', roles),
    },
    {
      key: 'chart',
      href: '/chart/add',
      icon: <Icons.BarChartOutlined iconSize="xl" />,
      title: t('New chart'),
      description: t('Turn a dataset into a chart in a few clicks'),
      allowed: findPermission('can_write', 'Chart', roles),
    },
    {
      key: 'sqllab',
      href: '/sqllab/',
      icon: <Icons.ConsoleSqlOutlined iconSize="xl" />,
      title: t('SQL Lab'),
      description: t('Write SQL and explore your databases'),
      allowed: findPermission('can_sqllab', 'Superset', roles),
    },
    {
      key: 'datasets',
      href: '/tablemodelview/list/',
      icon: <Icons.TableOutlined iconSize="xl" />,
      title: t('Datasets'),
      description: t('Manage the tables your charts are built on'),
      allowed: findPermission('can_read', 'Dataset', roles),
    },
  ];
  const visible = actions.filter(action => action.allowed);

  return (
    <Hero data-test="welcome-hero">
      <Greeting>{greetingFor(new Date().getHours(), name)}</Greeting>
      <Subtitle>{t('What would you like to work on today?')}</Subtitle>
      {visible.length > 0 && (
        <Actions>
          {visible.map(action => (
            <Action
              key={action.key}
              href={action.href}
              data-test={`welcome-action-${action.key}`}
            >
              <span className="welcome-action-icon">{action.icon}</span>
              <span>
                <span className="welcome-action-title">{action.title}</span>
                <span className="welcome-action-description">
                  {action.description}
                </span>
              </span>
            </Action>
          ))}
        </Actions>
      )}
    </Hero>
  );
}
