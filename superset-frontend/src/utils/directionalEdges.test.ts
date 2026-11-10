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
import { toDirectionalEdges, toLogicalIndent } from './directionalEdges';

test('leaves edges unchanged in LTR', () => {
  const edges = { right: true, bottomRight: true, bottom: true };
  expect(toDirectionalEdges(edges, 'ltr')).toBe(edges);
});

test('mirrors horizontal edges in RTL', () => {
  expect(
    toDirectionalEdges(
      { right: 'r', left: 'l', bottomRight: 'br', topLeft: 'tl', bottom: 'b' },
      'rtl',
    ),
  ).toEqual({
    left: 'r',
    right: 'l',
    bottomLeft: 'br',
    topRight: 'tl',
    bottom: 'b',
  });
});

test('reads the document direction by default', () => {
  document.documentElement.setAttribute('dir', 'rtl');
  expect(toDirectionalEdges({ right: true })).toEqual({ left: true });
  document.documentElement.removeAttribute('dir');
});

test('toLogicalIndent converts left indentation to logical properties', () => {
  expect(
    toLogicalIndent({ paddingLeft: 24, marginLeft: 4, height: 10 }),
  ).toEqual({
    paddingInlineStart: 24,
    marginInlineStart: 4,
    height: 10,
  });
});

test('toLogicalIndent returns styles without indentation unchanged', () => {
  const style = { height: 10 };
  expect(toLogicalIndent(style)).toBe(style);
  expect(toLogicalIndent(undefined)).toBeUndefined();
});
