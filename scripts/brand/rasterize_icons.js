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
// Rasterizes the brand SVGs into the PNG sizes browsers and PWAs need.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [src, dst] = process.argv.slice(2);
const jobs = [
  ['logo-mark.svg', 'favicon-64.png', 64],
  ['logo-mark.svg', 'apple-touch-icon.png', 180],
  ['logo-mark.svg', 'icon-192.png', 192],
  ['logo-mark.svg', 'icon-512.png', 512],
  ['maskable.svg', 'icon-maskable-192.png', 192],
  ['maskable.svg', 'icon-maskable-512.png', 512],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [svg, out, size] of jobs) {
    const data = fs.readFileSync(path.join(src, svg)).toString('base64');
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${data}" width="${size}" height="${size}" style="display:block">`);
    await p.screenshot({ path: path.join(dst, out), omitBackground: true });
  }
  await b.close();
})();
