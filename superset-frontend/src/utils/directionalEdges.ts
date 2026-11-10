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
import type { CSSProperties } from 'react';
import { getDocumentDirection } from '@apache-superset/core/theme';

const MIRRORED_EDGES: Record<string, string> = {
  left: 'right',
  right: 'left',
  topLeft: 'topRight',
  topRight: 'topLeft',
  bottomLeft: 'bottomRight',
  bottomRight: 'bottomLeft',
};

/**
 * Swap the horizontal edges of a `re-resizable` edge map (`enable`,
 * `handleClasses`, `handleComponent`, ...) when the document is
 * right-to-left, so resize handles sit on the mirrored edge.
 *
 * In LTR documents the map is returned unchanged.
 */
export function toDirectionalEdges<T extends Record<string, unknown>>(
  edges: T,
  direction = getDocumentDirection(),
): T {
  if (direction !== 'rtl') {
    return edges;
  }
  return Object.fromEntries(
    Object.entries(edges).map(([edge, value]) => [
      MIRRORED_EDGES[edge] ?? edge,
      value,
    ]),
  ) as T;
}

/**
 * Convert the horizontal indentation of an inline style object (as produced
 * by third-party components such as tree views) to logical properties, so
 * the indent sits on the inline-start edge in both LTR and RTL.
 */
export function toLogicalIndent(
  style: CSSProperties | undefined,
): CSSProperties | undefined {
  if (
    !style ||
    (style.paddingLeft === undefined && style.marginLeft === undefined)
  ) {
    return style;
  }
  const { paddingLeft, marginLeft, ...rest } = style;
  return {
    ...rest,
    ...(paddingLeft !== undefined && { paddingInlineStart: paddingLeft }),
    ...(marginLeft !== undefined && { marginInlineStart: marginLeft }),
  };
}
