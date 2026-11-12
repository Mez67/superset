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
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { t } from '@apache-superset/core/translation';

/**
 * Translated screen reader texts for @dnd-kit, which otherwise announces in
 * English. Pass as `<DndContext accessibility={dndAccessibility()}>`.
 */
export const dndAccessibility = (): {
  announcements: Announcements;
  screenReaderInstructions: ScreenReaderInstructions;
} => ({
  screenReaderInstructions: {
    draggable: t(
      'To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item. Press space bar again to drop the item in its new position, or press escape to cancel.',
    ),
  },
  announcements: {
    onDragStart: ({ active }) =>
      t('Picked up draggable item %s.', String(active.id)),
    onDragOver: ({ active, over }) =>
      over
        ? t(
            'Draggable item %s was moved over droppable area %s.',
            String(active.id),
            String(over.id),
          )
        : t(
            'Draggable item %s is no longer over a droppable area.',
            String(active.id),
          ),
    onDragEnd: ({ active, over }) =>
      over
        ? t(
            'Draggable item %s was dropped over droppable area %s.',
            String(active.id),
            String(over.id),
          )
        : t('Draggable item %s was dropped.', String(active.id)),
    onDragCancel: ({ active }) =>
      t(
        'Dragging was cancelled. Draggable item %s was dropped.',
        String(active.id),
      ),
  },
});
