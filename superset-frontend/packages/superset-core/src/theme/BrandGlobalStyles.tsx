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
