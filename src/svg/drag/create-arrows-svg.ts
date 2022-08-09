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

import {BarSvg} from '../lines/bar/bar-svg';
import {GanttSvg} from '../gantt-svg';
import {createSVG, getOffset, setAttribute} from '../../utils/svg.utils';
import {createArrowPath} from '../../utils/arrow.utils';
import {arrowClass, arrowFontSizeMultiplier} from '../lines/bar/arrow-svg';

export class CreateArrowsSvg {

  private readonly initialOffsetX: number;
  private readonly initialOffsetY: number;

  private arrowElements: SVGElement[];
  private listeners: { drag?: any, click?: any } = {};
  private paths: string[];
  private selectedToBars: BarSvg[];
  private fromBars: BarSvg[];

  constructor(private fromBar: BarSvg, private possibleToBars: BarSvg[], private gantt: GanttSvg) {
    this.paths = [this.createDragPath(0, 0)];
    this.arrowElements = [this.createElement(this.paths[0])];
    this.bindListeners();

    this.initialOffsetX = fromBar.endEndpointCX;
    this.initialOffsetY = fromBar.endEndpointCY;
  }

  private createElement(path: string): SVGElement {
    return createSVG('path', {
      d: path,
      class: arrowClass,
      'stroke-width': `${this.gantt.options.fontSize / arrowFontSizeMultiplier}`,
    }, this.gantt.layers.arrow);
  }

  private bindListeners() {
    const _this = this;
    this.listeners.drag = function dragFn(event) {
      const offset = getOffset(event);
      _this.onDrag(offset.x, offset.y);
    };

    this.gantt.svgContainer.addEventListener('mousemove', this.listeners.drag);
    this.gantt.svgContainer.addEventListener('touchmove', this.listeners.drag);

    setTimeout(() => {
      _this.listeners.click = function clickFn(event) {
        _this.onClick();
      };
      document.addEventListener('click', _this.listeners.click);
    });

  }

  private onClick() {
    if (this.selectedToBars?.length) {
      this.gantt.createArrows(this.fromBars || [this.fromBar], this.selectedToBars);
    }
    this.destroy();
    this.gantt.destroyDragArrow();
  }

  private onDrag(offsetX: number, offsetY: number) {
    this.selectedToBars = this.findToBarByClientPosition(offsetX, offsetY);
    if (this.selectedToBars.length) {
      this.fromBars = this.gantt.linesSvg.getSameLockedBars(this.fromBar);
      this.paths = this.fromBars.reduce((arr, fromBar) => {
        arr.push(...this.selectedToBars.map(bar => createArrowPath(fromBar, bar, this.gantt)));
        return arr;
      }, []);
    } else {
      this.fromBars = null;
      this.paths = [this.createDragPath(offsetX - this.initialOffsetX, offsetY - this.initialOffsetY)];
    }
    this.updatePosition();
  }

  private findToBarByClientPosition(clientX: number, clientY: number): BarSvg[] {
    const intersectBar = (this.possibleToBars || []).find(bar => {
      return bar.startX <= clientX && bar.endX >= clientX && bar.getY <= clientY && (bar.getY + bar.getHeight) >= clientY;
    });
    if (intersectBar) {
      return this.possibleToBars.filter(bar => bar.task.taskId === intersectBar.task.taskId);
    }
    return [];
  }

  private createDragPath(offsetX: number, offsetY: number) {
    const startX = this.fromBar.endEndpointCX;
    const startY = this.fromBar.startEndpointCY;
    return `M ${startX} ${startY}
                L ${startX + offsetX} ${startY + offsetY}`;
  }

  private updatePosition() {
    for (let i = 0; i < this.paths.length; i++) {
      if (this.arrowElements[i]) {
        setAttribute(this.arrowElements[i], 'd', this.paths[i]);
      } else {
        this.arrowElements[i] = this.createElement(this.paths[i]);
      }
    }

    for (let i = this.paths.length; i < this.arrowElements.length; i++) {
      setAttribute(this.arrowElements[i], 'd', '');
    }
  }

  public destroy() {
    this.paths = null;
    this.arrowElements?.forEach(element => element.remove());
    this.fromBar.onCreateArrowDestroyed();

    this.removeListeners();
  }

  private removeListeners() {
    if (this.listeners) {
      this.gantt.svgContainer.removeEventListener('mousemove', this.listeners.drag);
      this.gantt.svgContainer.removeEventListener('touchmove', this.listeners.drag);
      document.removeEventListener('click', this.listeners.click);
    }
  }
}
