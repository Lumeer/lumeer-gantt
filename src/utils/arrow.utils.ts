/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {BarSvg} from '../svg/lines/bar/bar-svg';
import {GanttSvg} from '../svg/gantt-svg';

const arrowEndSize = 5;
const arrowEndPath = ` m -${arrowEndSize} -${arrowEndSize}
                       l ${arrowEndSize} ${arrowEndSize}
                       l -${arrowEndSize} ${arrowEndSize}`;

export function createArrowPath(fromBar: BarSvg, toBar: BarSvg, gantt: GanttSvg): string {
  const fromIsBelowTo = fromBar.getY >= toBar.getY;
  const areOnSameLine = fromBar.getY === toBar.getY;

  const drawsFromEnd = fromBar.endEndpointCX < toBar.startEndpointCX;

  const startX = drawsFromEnd ? fromBar.endEndpointCX : fromBar.startEndpointCX;
  const startY = drawsFromEnd ? fromBar.endEndpointCY : fromBar.startEndpointCY;

  const endX = toBar.startEndpointCX;
  const endY = toBar.startEndpointCY;

  const curve = gantt.options.arrowCurve;
  const clockwise = fromIsBelowTo ? 1 : 0;
  const curveY = fromIsBelowTo ? -curve : curve;

  const down = toBar.getY + toBar.getHeight / 2 - curveY;
  if (drawsFromEnd) {
    if (areOnSameLine) {
      return `
                    M ${startX} ${startY}
                    L ${endX} ${endY}
                    ${arrowEndPath}`;
    } else {
      return `
                    M ${startX} ${startY}
                    V ${down}
                    a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curveY}
                    L ${endX} ${endY}
                    ${arrowEndPath}`;
    }
  } else {
    const up = gantt.options.barHeight / 2 + gantt.options.padding / 4 - curve;
    const left = toBar.startEndpointCX - curve * 2;

    if (areOnSameLine) {
      const down = toBar.getY + toBar.getHeight / 2 - curve;

      return `
                M ${startX} ${startY}
                v -${up}
                a ${curve} ${curve} 1 0 0 -${curve} -${curve}
                H ${left}
                a ${curve} ${curve} 0 0 0 -${curve} ${curve}
                V ${down}
                a ${curve} ${curve} 0 0 0 ${curve} ${curve}
                L ${endX} ${endY}
                ${arrowEndPath}`;
    } else {
      const hValue = Math.min(toBar.startEndpointCX - curve * 2, fromBar.startEndpointCX - curve * 2);

      return `
                    M ${startX} ${startY}
                    H ${hValue}
                    a ${curve} ${curve} 0 0 ${clockwise} -${curve} ${curveY}
                    V ${down}
                    a ${curve} ${curve} 0 0 ${clockwise} ${curve} ${curveY}
                    L ${endX} ${endY}
                    ${arrowEndPath}`;
    }

  }
}
