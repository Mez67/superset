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

import { css, useTheme, Global } from '@emotion/react';

/**
 * Visual polish for this distribution that theme tokens cannot express on
 * their own: layered surfaces, hover states, the sign-in page and focus
 * rings. Kept apart from GlobalStyles so upstream changes there merge
 * cleanly. Every value comes from the theme, so light, dark and custom
 * themes all apply.
 */
export const BrandGlobalStyles = () => {
  const theme = useTheme();
  return (
    <Global
      key={`brand-${theme.colorPrimary}-${theme.colorBgLayout}`}
      styles={css`
        /* Soft canvas behind white surfaces */
        body {
          background-color: ${theme.colorBgLayout};
        }

        /* Navbar: a lifted bar instead of a hard rule */
        #main-menu {
          position: relative;
          border-bottom-color: ${theme.colorBorderSecondary};
          box-shadow: ${theme.boxShadowTertiary};
        }

        /* List pages: the table sits on a card */
        .superset-list-view .ant-table {
          border: 1px solid ${theme.colorBorderSecondary};
          border-radius: ${theme.borderRadiusLG}px;
          box-shadow: ${theme.boxShadowTertiary};
        }

        .superset-list-view .ant-table-tbody > tr > td {
          transition: background-color ${theme.motionDurationMid};
        }

        /* Card grids (list card view, home page) */
        [data-test='styled-card'] {
          border-color: ${theme.colorBorderSecondary};
          box-shadow: ${theme.boxShadowTertiary};
          transition:
            box-shadow ${theme.motionDurationMid} ease,
            transform ${theme.motionDurationMid} ease,
            border-color ${theme.motionDurationMid} ease;
        }

        [data-test='styled-card']:hover {
          border-color: ${theme.colorBorder};
          box-shadow: ${theme.boxShadowSecondary};
          transform: translateY(-2px);
        }

        /* Home page: each section is a card */
        .welcome-sections.ant-collapse > .ant-collapse-item.ant-collapse-item {
          margin: ${theme.margin}px ${theme.marginLG}px 0;
          background: ${theme.colorBgContainer};
          border: 1px solid ${theme.colorBorderSecondary};
          border-radius: ${theme.borderRadiusLG}px;
          box-shadow: ${theme.boxShadowTertiary};
        }

        .welcome-sections.ant-collapse
          > .ant-collapse-item.ant-collapse-item:last-of-type {
          margin-bottom: ${theme.marginLG}px;
        }

        .welcome-sections > .ant-collapse-item > .ant-collapse-header {
          font-size: ${theme.fontSizeLG}px;
          font-weight: ${theme.fontWeightStrong};
          padding: ${theme.paddingSM}px ${theme.paddingLG}px;
        }

        /* Page titles above list pages */
        .ant-row.menu > .header {
          font-size: ${theme.fontSizeHeading4}px;
        }

        /* Dashboard and Explore headers: soft edge instead of a hard rule */
        .header-with-actions {
          box-shadow: ${theme.boxShadowTertiary};
        }

        html body [data-test='dashboard-header-container'] {
          border-bottom-color: ${theme.colorBorderSecondary};
        }

        /* Explore: side panels on the canvas, the chart on a card */
        div:has(> .main-explore-content) {
          background-color: ${theme.colorBgLayout};
        }

        .explore-column.data-source-selection,
        .explore-column.controls-column {
          background-color: ${theme.colorBgContainer};
        }

        div:has(> .main-explore-content) > .main-explore-content {
          border-inline-color: transparent;
          padding: ${theme.padding}px;
          box-sizing: border-box;
        }

        .main-explore-content > .chart-container {
          padding: 0 ${theme.padding}px;
          background-color: ${theme.colorBgContainer};
          border: 1px solid ${theme.colorBorderSecondary};
          border-radius: ${theme.borderRadiusLG}px;
          box-shadow: ${theme.boxShadowTertiary};
          box-sizing: border-box;
        }

        [data-test='control-tabs'] .ant-collapse-header .ant-collapse-title {
          font-weight: ${theme.fontWeightStrong};
        }

        /* Dashboard tiles rise slightly on hover */
        .dashboard-component-chart-holder:hover {
          box-shadow: ${theme.boxShadowSecondary};
        }

        /* Sign-in and password pages */
        html body [data-test='login-form'] {
          min-height: calc(100vh - 64px);
          height: auto;
          padding: ${theme.paddingLG}px;
          box-sizing: border-box;
          background:
            radial-gradient(
              circle at 15% 10%,
              ${theme.colorPrimaryBg} 0,
              transparent 45%
            ),
            radial-gradient(
              circle at 85% 90%,
              ${theme.colorPrimaryBg} 0,
              transparent 40%
            ),
            ${theme.colorBgLayout};
        }

        html body [data-test='login-form'] > .ant-card {
          margin-top: 0;
          border: 1px solid ${theme.colorBorderSecondary};
          border-radius: ${theme.borderRadiusLG + 4}px;
          box-shadow: ${theme.boxShadow};
          background: ${theme.colorBgContainer};
        }

        html body [data-test='login-form'] > .ant-card .ant-card-head-title {
          font-size: ${theme.fontSizeHeading4}px;
          text-align: center;
        }

        /* Dashboard filter bar (vertical, beside the dashboard) */
        [data-test='dashboard-filters-panel'] {
          background-color: ${theme.colorBgContainer};
        }

        /* Header: title, settings and collapse, separated from the filters */
        [data-test='dashboard-filters-panel']
          div:has(> div > [data-test='filter-bar__collapse-button']) {
          padding: ${theme.paddingSM}px ${theme.padding}px;
          margin-bottom: ${theme.paddingXS}px;
          border-bottom: 1px solid ${theme.colorBorderSecondary};
        }

        [data-test='dashboard-filters-panel']
          div:has(> [data-test='filter-bar__collapse-button']) {
          gap: ${theme.sizeXXS}px;
          padding: 0;
        }

        [data-test='dashboard-filters-panel']
          div:has(> [data-test='filter-bar__collapse-button'])
          > span {
          font-size: ${theme.fontSize + 1}px;
        }

        [data-test='dashboard-filters-panel']
          div:has(> [data-test='filter-bar__collapse-button'])
          .ant-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: ${theme.borderRadiusSM}px;
          color: ${theme.colorTextSecondary};
          transition:
            background-color ${theme.motionDurationMid},
            color ${theme.motionDurationMid};

          .anticon {
            color: inherit;
            font-size: ${theme.fontSizeLG}px;
          }

          &:hover {
            color: ${theme.colorText};
            background-color: ${theme.colorFillTertiary};
          }
        }

        /* Filter names lead each control */
        [data-test='dashboard-filters-panel']
          [data-test='filter-control-name'] {
          font-size: ${theme.fontSizeSM + 1}px;
          font-weight: ${theme.fontWeightStrong};
          color: ${theme.colorText};
        }

        [data-test='dashboard-filters-panel']
          .filter-bar-scroll
          .ant-form-item {
          margin-bottom: ${theme.marginXS}px;
        }

        /* Footer: full-width actions on a solid, separated strip */
        [data-test='dashboard-filters-panel']
          [data-test='filterbar-action-buttons'] {
          align-items: stretch;
          gap: ${theme.sizeXS}px;
          padding: ${theme.paddingSM}px ${theme.padding}px;
          background: ${theme.colorBgContainer};
          border-top: 1px solid ${theme.colorBorderSecondary};

          [data-test='filter-bar__apply-button'] {
            width: 100%;
            height: 36px;
            margin-bottom: 0;
          }

          > div {
            justify-content: center;
          }

          [data-test='filter-bar__clear-button'] {
            flex: 1;
          }
        }

        /* Collapsed bar: a themed strip that reads as a button */
        [data-test='dashboard-filters-panel']
          [data-test='filter-bar__collapsable'] {
          width: 100%;
          height: auto;
          padding: ${theme.paddingSM}px 0;
          gap: ${theme.sizeSM}px;
          color: ${theme.colorTextSecondary};
          background: transparent;
          border-radius: 0;
          transition:
            background-color ${theme.motionDurationMid},
            color ${theme.motionDurationMid};

          .anticon {
            color: inherit;
          }

          &:hover {
            color: ${theme.colorPrimary};
            background-color: ${theme.colorPrimaryBg};
          }
        }

        /* In RTL the bar sits on the right, so the arrows point the other way */
        html[dir='rtl'] [data-test='filter-bar__collapse-button'] .anticon {
          transform: rotate(90deg);
        }

        html[dir='rtl'] [data-test='filter-bar__expand-button'] {
          transform: rotate(-90deg);
        }

        /* Keyboard focus is always visible */
        a:focus-visible,
        button:focus-visible,
        [role='button']:focus-visible,
        [role='tab']:focus-visible {
          outline: 2px solid ${theme.colorPrimary};
          outline-offset: 2px;
        }

        /* Thin, theme-colored scrollbars */
        * {
          scrollbar-width: thin;
          scrollbar-color: ${theme.colorBorder} transparent;
        }

        ::selection {
          background: ${theme.colorPrimaryBg};
        }
      `}
    />
  );
};
