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

import {GanttTask} from '../../../model/task';
import {
  cleanGanttTask,
  computeDateByPosition,
  computeDistanceFromStart,
  computeNearestTickPosition
} from '../../../utils/gantt.utils';
import {
  animateSVG,
  createMarkerPath,
  createSVG,
  getEndX,
  getHeight, getMarkerSize, getWidth, getX,
  getY, hideElements, setAttribute,
  setAttributes, showElements
} from '../../../utils/svg.utils';
import {arraySubtract, closestElement, isNotNullOrUndefined, isNullOrUndefined} from '../../../utils/common.utils';
import {BarsSvg} from './bars-svg';
import {ArrowSvg} from './arrow-svg';
import {GanttSvg} from '../../gantt-svg';
import {formatDate} from '../../../utils/date.utils';

const handleSize = 10;
const endpointR = 5;
const handlePadding = 1;

const handleClass = 'bar-handle';
export const barWrapperClass = 'bar-wrapper';
export const barGroupWrapperClass = 'bar-group-wrapper';
export const barGroupClass = 'bar-group';

export class BarSvg {

  private barWrapperElement: SVGGraphicsElement;
  private barGroupElement: SVGGraphicsElement;
  private barElement: SVGGraphicsElement;
  private handleProgressGroup: SVGGraphicsElement;

  private progressElement: SVGElement;
  private progressInnerElement: SVGElement;

  private textElement: SVGElement;

  private handleRightElement: SVGElement;
  private handleLeftElement: SVGElement;
  private handleOverflowElement: SVGElement;

  private handleProgressElement: SVGElement;
  private handleProgressTextElement: SVGElement;
  private handleProgressMarkerElement: SVGElement;

  private endpointStartElement: SVGElement;
  private endpointEndElement: SVGElement;
  private endpointEndClickListener: any;

  private fromArrowsSvgs: ArrowSvg[] = [];
  private toArrowsSvgs: ArrowSvg[] = [];

  private x1: number;
  private x1Drag: number;
  private x2: number;
  private x2Drag: number;
  private y: number;
  private yDrag: number;
  private height: number;
  private progress: number;
  private progressDrag: number;

  private parentSvg: BarsSvg;
  private parentSvgDrag: BarsSvg;

  private draggingVertically = false;
  private sideHandlesOverflowing = false;

  constructor(public task: GanttTask,
              private yPosition: number,
              private gantt: GanttSvg,
              private barsSvgs: BarsSvg,
  ) {
    this.x1 = computeDistanceFromStart(this.gantt.options, this.gantt.settings, this.task.startDate);
    this.x2 = computeDistanceFromStart(this.gantt.options, this.gantt.settings, this.task.endDate);
    this.y = this.yPosition + this.gantt.options.padding / 2;
    this.height = this.gantt.options.barHeight;
    this.progress = this.task.progress;
    this.parentSvg = this.barsSvgs;
  }

  public get id(): string {
    return this.task.id;
  }

  public get barWidth(): number {
    return Math.max(this.x2 - this.x1, 1);
  }

  public get width(): number {
    return this.barWrapperElement.getBBox().width;
  }

  public get x(): number {
    return this.x1;
  }

  public get getY(): number {
    return this.y;
  }

  public get getHeight(): number {
    return this.height;
  }

  public get startX(): number {
    return this.barWrapperElement.getBBox().x;
  }

  public get endX(): number {
    return this.startX + this.width;
  }

  public get startEndpointCX(): number {
    return this.x1 - endpointR * 2;
  }

  public get startEndpointCY(): number {
    return this.y + this.height / 2;
  }

  public get endEndpointCX(): number {
    return this.x2 + endpointR * 2;
  }

  public get endEndpointCY(): number {
    return this.startEndpointCY;
  }

  public get currentParent(): BarsSvg {
    return this.parentSvg;
  }

  public get initialParent(): BarsSvg {
    return this.parentSvgDrag || this.parentSvg;
  }

  public progressChanged(): boolean {
    return isNotNullOrUndefined(this.progressDrag) && this.progress !== this.progressDrag;
  }

  public parentChanged(): boolean {
    return isNotNullOrUndefined(this.parentSvgDrag) && this.parentSvg !== this.parentSvgDrag;
  }

  public datesChanged(): boolean {
    return (isNotNullOrUndefined(this.x1Drag) && this.x1 !== this.x1Drag)
      || (isNotNullOrUndefined(this.x2Drag) && this.x2 !== this.x2Drag);
  }

  public setFromArrows(arrows: ArrowSvg[]) {
    this.fromArrowsSvgs = arrows;
    this.checkArrowsEndpoints();
  }

  public addFromArrows(arrows: ArrowSvg[]) {
    if (!this.fromArrowsSvgs) {
      this.fromArrowsSvgs = [];
    }
    this.fromArrowsSvgs.push(...arrows);
    this.checkArrowsEndpoints();
  }

  public addToArrow(arrow: ArrowSvg) {
    if (!this.toArrowsSvgs) {
      this.toArrowsSvgs = [];
    }
    this.toArrowsSvgs.push(arrow);
    this.checkArrowsEndpoints();
  }

  public removeFromArrow(toBar: BarSvg) {
    const arrowIndex = this.getFromArrowIndex(toBar);
    if (arrowIndex !== -1) {
      const arrow = this.fromArrowsSvgs[arrowIndex];
      arrow.destroy();
      this.fromArrowsSvgs.splice(arrowIndex, 1);
    }
    this.checkArrowsEndpoints();
  }

  private getFromArrowIndex(toBar: BarSvg): number {
    return (this.fromArrowsSvgs || []).findIndex(arrow => arrow.fromBar === this && arrow.toBar === toBar);
  }

  public removeToArrow(fromBar: BarSvg) {
    const arrowIndex = this.getToBarArrowIndex(fromBar);
    if (arrowIndex !== -1) {
      const arrow = this.toArrowsSvgs[arrowIndex];
      arrow.destroy();
      this.toArrowsSvgs.splice(arrowIndex, 1);
    }
    this.checkArrowsEndpoints();
  }

  private getToBarArrowIndex(fromBar: BarSvg): number {
    return (this.toArrowsSvgs || []).findIndex(arrow => arrow.fromBar === fromBar && arrow.toBar === this);
  }

  public setArrowActive(toBar: BarSvg, active: boolean) {
    const arrowIndex = this.getFromArrowIndex(toBar);
    if (arrowIndex !== -1) {
      if (active) {
        this.fromArrowsSvgs[arrowIndex].setActive();
      } else {
        this.fromArrowsSvgs[arrowIndex].removeActive();
      }
    }
  }

  public render() {
    this.renderBarWrappers();
    this.renderElements();
  }

  private renderElements() {
    this.renderBar();
    this.renderProgress();
    this.renderText();
    this.renderEndpoints();
    this.renderResizeHandles();
  }

  private renderBarWrappers() {
    this.barWrapperElement = createSVG('g', {
      class: barWrapperClass,
      id: this.task.id
    }, this.gantt.layers.bar);

    const innerBarGroup = createSVG('g', {
      class: barGroupWrapperClass,
    }, this.barWrapperElement);

    this.barGroupElement = createSVG('g', {
      class: barGroupClass,
    }, innerBarGroup);
  }

  private renderBar() {
    const x = this.x1;
    const y = this.y;
    const width = this.barWidth;
    const height = this.height;

    if (this.barElement) {
      setAttributes(this.barElement, {x, y, width, height});
    } else {
      this.barElement = createSVG('rect', {
        x, y, width, height,
        rx: this.gantt.options.barCornerRadius,
        ry: this.gantt.options.barCornerRadius,
        class: 'bar',
        style: this.task.barColor ? 'fill:' + this.task.barColor : '',
      }, this.barGroupElement);

      animateSVG(this.barElement, 'width', 0, width);
    }

  }

  private renderProgress() {
    const totalProgressWidth = this.barWidth * this.progress / 100;
    const progressWidth = Math.min(this.barWidth, totalProgressWidth);
    const x = this.x1;
    const y = this.y;
    const height = this.height;

    if (this.progressElement) {
      setAttributes(this.progressElement, {x, y, height, width: totalProgressWidth});
    } else {
      this.progressElement = createSVG('rect', {
        x, y, width: totalProgressWidth, height,
        rx: this.gantt.options.barCornerRadius,
        ry: this.gantt.options.barCornerRadius,
        class: 'bar-progress',
        style: (this.task.progressColor ? 'fill:' + this.task.progressColor + '; ' : '') + 'opacity: 0.5'
      }, this.barGroupElement);
      animateSVG(this.progressElement, 'width', 0, totalProgressWidth);
    }

    if (this.progressInnerElement) {
      setAttributes(this.progressInnerElement, {x, y, height, width: progressWidth});
    } else {
      this.progressInnerElement = createSVG('rect', {
        x, y, width: progressWidth, height,
        rx: this.gantt.options.barCornerRadius,
        ry: this.gantt.options.barCornerRadius,
        class: 'bar-progress',
        style: this.task.progressColor ? 'fill:' + this.task.progressColor + '; ' : ''
      }, this.barGroupElement);
      animateSVG(this.progressInnerElement, 'width', 0, progressWidth);
    }
  }

  private renderText() {
    const x = this.x1 + this.barWidth / 2;
    const y = this.y + this.height / 2;
    if (this.textElement) {
      setAttributes(this.textElement, {x, y});
    } else {
      this.textElement = createSVG('text', {
        x, y,
        style: this.task.textColor ? `fill: ${this.task.textColor};` : '',
        class: 'bar-label',
        'font-size': `${this.gantt.options.fontSize}px`
      }, this.barGroupElement, this.task.name);
    }

    this.updateLabelPosition();
  }

  private updateLabelPosition() {
    if (this.textElement.getBoundingClientRect().width > this.barWidth) {
      this.textElement.classList.add('big');
      setAttribute(this.textElement, 'x', String(this.x2 + endpointR * 4))
    } else {
      this.textElement.classList.remove('big');
      setAttribute(this.textElement, 'x', String(this.x1 + this.barWidth / 2));
    }
  }

  private renderResizeHandles() {
    this.renderBarResizeHandles();
    this.renderProgressResizeHandle();
  }

  private renderBarResizeHandles() {
    if (this.isDraggableLeft()) {
      const x = this.x1 + handlePadding;
      const y = this.y + handlePadding;
      const width = handleSize;
      const height = this.height - handlePadding * 2;

      if (this.handleLeftElement) {
        setAttributes(this.handleLeftElement, {x, y, width, height});
      } else {
        this.handleLeftElement = createSVG('rect', {
          x, y, width, height,
          rx: this.gantt.options.barCornerRadius,
          ry: this.gantt.options.barCornerRadius,
          class: `${handleClass} left`,
        }, this.barGroupElement);
      }
    }

    if (this.isDraggableRight()) {
      const x = this.x1 + this.barWidth - handlePadding - handleSize;
      const y = this.y + handlePadding;
      const width = handleSize;
      const height = this.height - handlePadding * 2;

      if (this.handleRightElement) {
        setAttributes(this.handleRightElement, {x, y, width, height});
      } else {
        this.handleRightElement = createSVG('rect', {
          x, y, width, height,
          rx: this.gantt.options.barCornerRadius,
          ry: this.gantt.options.barCornerRadius,
          class: `${handleClass} right`,
        }, this.barGroupElement);
      }

    }
  }

  private isDraggableLeft(): boolean {
    return this.task.startDrag && this.gantt.options.resizeTaskLeft;
  }

  private isDraggableRight(): boolean {
    return this.task.endDrag && this.gantt.options.resizeTaskRight;
  }

  private isProgressDraggable(): boolean {
    return this.task.progressDrag && this.gantt.options.resizeProgress && isNotNullOrUndefined(this.progress);
  }

  private isDraggable(): boolean {
    return this.task.draggable;
  }

  private renderProgressResizeHandle() {
    if (this.isProgressDraggable()) {

      if (!this.handleProgressGroup) {
        this.handleProgressGroup = createSVG('g', {
          class: 'bar-handle-progress-group'
        }, this.barGroupElement);
      }

      const points = this.getProgressPolygonPoints().join(',');
      if (this.handleProgressElement) {
        setAttributes(this.handleProgressElement, {points});
      } else {
        this.handleProgressElement = createSVG('polygon', {
          points, class: `${handleClass} progress`,
        }, this.handleProgressGroup);
      }

      const x = getEndX(this.progressElement);
      const scale = 4;
      const markerPath = createMarkerPath(x, this.y, scale);
      if (this.handleProgressMarkerElement) {
        setAttribute(this.handleProgressMarkerElement, 'd', markerPath)
      } else {
        this.handleProgressMarkerElement = createSVG('path', {
          d: markerPath,
          class: 'progress-marker',
          display: 'none',
        }, this.handleProgressGroup);
      }

      const textProgress = this.progress > 999 ? String('999+') : String(this.progress);
      const {height} = getMarkerSize(scale);
      const y = this.y - height / 2 - scale;
      if (this.handleProgressTextElement) {
        setAttributes(this.handleProgressTextElement, {x, y});
        this.handleProgressTextElement.innerHTML = textProgress;
      } else {
        this.handleProgressTextElement = createSVG('text', {
          x, y,
          class: 'bar-label',
          display: 'none',
          'font-size': `${this.gantt.options.fontSize}px`
        }, this.handleProgressGroup, textProgress);
      }

    }
  }

  private getProgressPolygonPoints(): number[] {
    const triangleDiagonal = Math.sqrt(Math.pow(handleSize, 2) - Math.pow(handleSize / 2, 2));
    const y = getY(this.progressElement);
    const endX = getEndX(this.progressElement);
    const height = getHeight(this.progressElement);

    return [
      endX - handleSize / 2,
      y + height,
      endX + handleSize / 2,
      y + height,
      endX,
      y + height - triangleDiagonal
    ];
  }

  private renderEndpoints() {
    if (!this.hasAnyDependencies()) {
      return;
    }

    let cx = this.startEndpointCX;
    const cy = this.startEndpointCY;
    const r = endpointR;

    if (this.endpointStartElement) {
      setAttributes(this.endpointStartElement, {cx, cy, r});
    } else {
      this.endpointStartElement = createSVG('circle', {
        cx, cy, r, class: 'endpoint start',
      }, this.barGroupElement);
    }

    cx = this.endEndpointCX;

    if (this.endpointEndElement) {
      setAttributes(this.endpointEndElement, {cx, cy, r});
      this.checkEndpointEndClickListener();
    } else {
      this.endpointEndElement = createSVG('circle', {
        cx, cy, r,
        class: `endpoint end`
      }, this.barGroupElement);
      this.checkEndpointEndClickListener();
    }
  }

  private checkEndpointEndClickListener() {
    const clickable = this.hasPossibleDependencies();
    if (clickable && !this.endpointEndClickListener) {
      this.endpointEndClickListener = () => this.onEndpointEndClick();
      this.endpointEndElement.addEventListener('click', this.endpointEndClickListener);
      this.endpointEndElement.classList.add('clickable');
    } else if (!clickable && this.endpointEndClickListener) {
      this.endpointEndElement.removeEventListener('click', this.endpointEndClickListener);
      this.endpointEndClickListener = null;
      this.endpointEndElement.classList.remove('clickable');
    }

  }

  private onEndpointEndClick() {
    if (!this.gantt.preventEventListeners) {
      this.endpointEndElement?.classList.add('active');
      this.gantt.createDragArrow(this);
    }
  }

  public onCreateArrowDestroyed() {
    this.endpointEndElement?.classList.remove('active');
  }

  private hasAnyDependencies(): boolean {
    return [...(this.task.allowedDependencies || []), ...(this.task.dependencies || [])].length > 0;
  }

  private hasPossibleDependencies(): boolean {
    const possibleIds = arraySubtract(this.task.allowedDependencies, this.task.dependencies);
    return arraySubtract(possibleIds, this.task.parentDependencies).length > 0;
  }

  public handleDragStart(element: any) {
    if (element === this.handleProgressElement) {
      showElements(this.handleProgressTextElement, this.handleProgressMarkerElement);
    }

    if (element === this.handleLeftElement || element === this.handleRightElement) {
      this.sideHandlesOverflowing = getX(this.handleRightElement) <= getX(this.handleLeftElement) + getWidth(this.handleLeftElement);
    }

    this.x1Drag = this.x1;
    this.x2Drag = this.x2;
    this.progressDrag = this.progress;
    this.yDrag = this.y;
    this.parentSvgDrag = this.parentSvg;
    this.draggingVertically = false;

    [...this.fromArrowsSvgs, ...this.toArrowsSvgs].forEach(arrow => arrow.handleDragStart(element));
  }


  public handleDrag(element: any, dx: number, dy: number, x: number, y: number) {
    if (element === this.handleLeftElement || element === this.handleRightElement) {
      if (this.sideHandlesOverflowing) {
        this.assignHandleOverflowElement(dx);
        if (this.handleOverflowElement === this.handleRightElement) {
          this.isDraggableRight() && this.resizeRight(dx, x);
        } else if (this.handleOverflowElement === this.handleLeftElement) {
          this.isDraggableLeft() && this.resizeLeft(dx, x);
        }

      } else {
        if (element === this.handleLeftElement) {
          this.isDraggableLeft() && this.resizeLeft(dx, x);
        } else if (element === this.handleRightElement) {
          this.isDraggableRight() && this.resizeRight(dx, x);
        }
      }

    } else if (element === this.handleProgressElement) {
      this.resizeProgress(dx, x);
    } else if (this.task.draggable) {
      const barElement = closestElement(`.${barWrapperClass}`, element);
      if (barElement === this.barWrapperElement) {
        this.dragWrapper(dx, dy, x, y);
      }
    }
  }

  private assignHandleOverflowElement(dx: number) {
    if (!this.handleOverflowElement) {
      if (dx > 0) {
        this.handleOverflowElement = this.handleRightElement;
      } else if (dx < 0) {
        this.handleOverflowElement = this.handleLeftElement;
      }
    }
  }

  private resizeLeft(dx: number, x: number, update: boolean = true) {
    if (dx === 0) {
      return;
    }

    const x1Copy = this.x1;

    if (this.x1Drag + x < this.x2) {
      const nearestTick = computeNearestTickPosition(this.gantt.settings, this.x1Drag + x);

      // drag forward and nearest tick is before current position
      if (dx > 0 && nearestTick.x < this.x1) {
        return;
      }

      // drag backwards and nearest tick is after current position
      if (dx < 0 && nearestTick.x > this.x1) {
        return;
      }

      if (this.x1 !== nearestTick.x && (this.x2 - nearestTick.x > 1)) {
        const diff = nearestTick.x - this.x1;
        this.x1 = nearestTick.x;
        this.checkBarPosition(x1Copy, this.x2);
        if (update) {
          this.updatePositions();
          this.emitBarDragging(diff, 0);
        }
      }
    }
  }

  private updatePositions() {
    this.renderElements();
    this.updateTaskData();
  }

  private resizeRight(dx: number, x: number, update: boolean = true) {
    if (dx === 0) {
      return;
    }

    if (this.x2Drag + x > this.x1) {
      const nearestTick = computeNearestTickPosition(this.gantt.settings, this.x2Drag + x);

      // drag forward and nearest tick is before current position
      if (dx > 0 && nearestTick.x < this.x2) {
        return;
      }

      // drag backwards and nearest tick is after current position
      if (dx < 0 && nearestTick.x > this.x2) {
        return;
      }

      if (this.x2 !== nearestTick.x && (nearestTick.x - this.x1 > 1)) {
        const diff = nearestTick.x - this.x2;
        this.x2 = nearestTick.x;
        if (update) {
          this.updatePositions();
          this.emitBarDragging(0, diff);
        }
      }
    }
  }

  private resizeProgress(dx: number, x: number) {
    if (dx === 0 || !this.isProgressDraggable()) {
      return;
    }

    const newProgressWidth = x + this.barWidth * this.progressDrag / 100;
    const newProgress = Math.max(Math.round(newProgressWidth / this.barWidth * 100), 0);
    const newProgressByRange = this.checkProgressByRange(newProgress, dx);

    if (isNullOrUndefined(newProgressByRange)) {
      return;
    }

    if ((dx > 0 && newProgressByRange > this.progress) || (dx < 0 && newProgressByRange < this.progress)) {
      const progressDiff = newProgressByRange - this.progress;
      this.progress = newProgressByRange;
      this.updateProgressPosition();
      this.emitProgressDragging(progressDiff);
    }
  }

  private checkProgressByRange(progress: number, dx: number): number | null {
    const minProgress = isNotNullOrUndefined(this.task.minProgress) ? this.task.minProgress : 0;
    const maxProgress = isNotNullOrUndefined(this.task.maxProgress) ? this.task.maxProgress : Number.MAX_SAFE_INTEGER;

    if (progress >= minProgress && progress <= maxProgress) {
      return progress;
    }

    if (dx > 0) {
      if (progress < minProgress) {
        return progress;
      } else if (progress > maxProgress) {
        return maxProgress;
      }

    } else if (dx < 0) {
      if (progress > maxProgress) {
        return progress;
      } else if (progress < minProgress) {
        return minProgress;
      }
    }

    return null;
  }

  private updateProgressPosition() {
    this.task.progress = this.progress;
    this.renderProgress();
    this.renderProgressResizeHandle();
  }

  private emitProgressDragging(diff: number) {
    this.gantt.linesSvg.onBarProgressDragging(this, diff);
    (this.parentSvg || this.barsSvgs).onBarDragging(this, true);
  }

  private dragWrapper(dx: number, dy: number, x: number, y: number) {
    this.draggingVertically = this.dragBarVertical(dy, y) || this.draggingVertically;
    if (dx < 0) {
      if (this.isDraggable()) {
        const x1BeforeResize = this.x1;
        this.resizeLeft(dx, x, false);
        const diff = this.x1 - x1BeforeResize;
        if (diff !== 0) {
          this.x2 += diff;
          this.updatePositions();
          this.emitBarDragging(diff, diff, this.draggingVertically);
        }
      }
    } else if (dx > 0) {
      if (this.isDraggable()) {
        const x2BeforeResize = this.x2;
        this.resizeRight(dx, x, false);
        const diff = this.x2 - x2BeforeResize;
        if (diff !== 0) {
          this.x1 += diff;
          this.updatePositions();
          this.emitBarDragging(diff, diff, this.draggingVertically);
        }
      }
    } else if (this.isDraggableVertically()) {
      this.updateTaskData();
      this.emitBarDragging(0, 0, this.draggingVertically);
    }
  }

  private dragBarVertical(dy: number, y: number): boolean {
    if (!this.isDraggableVertically() || dy === 0) {
      return false;
    }

    return this.gantt.linesSvg.handleVerticalDragBar(this, dy, this.yDrag + y);
  }

  private isDraggableVertically(): boolean {
    return this.gantt.containsSwimLanes && this.gantt.options.dragTaskSwimlanes;
  }

  private emitBarDragging(dx1: number, dx2: number, keepYPosition?: boolean) {
    this.gantt.linesSvg.onBarDragging(this, dx1, dx2);
    (this.parentSvg || this.barsSvgs).onBarDragging(this, keepYPosition);
    this.updateArrows();
  }

  private checkArrowsEndpoints() {
    if (this.endpointEndElement) {
      this.checkEndpointEndClickListener();
    }
  }

  private updateArrows() {
    this.fromArrowsSvgs.forEach(arrow => arrow.updatePosition());
    this.toArrowsSvgs.forEach(arrow => arrow.updatePosition());
    this.checkArrowsEndpoints();
  }

  public handleDragEnd(element: any) {
    [...this.fromArrowsSvgs, ...this.toArrowsSvgs].forEach(arrow => arrow.handleDragEnd(element));

    this.x1Drag = null;
    this.x2Drag = null;
    this.progressDrag = null;
    this.yDrag = null;
    this.parentSvgDrag = null;
    this.draggingVertically = false;
    this.handleOverflowElement = null;
    this.sideHandlesOverflowing = false;
    hideElements(this.handleProgressTextElement, this.handleProgressMarkerElement);
    this.updateTaskData();
  }

  private updateTaskData() {
    this.task.startDate = computeDateByPosition(this.gantt.options, this.gantt.settings, this.x1);
    this.task.start = formatDate(this.task.startDate, this.gantt.options.dateFormat);
    this.task.endDate = computeDateByPosition(this.gantt.options, this.gantt.settings, this.x2);
    this.task.end = formatDate(this.task.endDate, this.gantt.options.dateFormat);
    this.task.progress = this.progress;
    this.task.swimlanes = this.currentParent.swimlaneObjects;
  }

  public dragBar(dx1: number, dx2: number) {
    const dLeft = this.isDraggableLeft() ? dx1 : 0;
    const dRight = this.isDraggableRight() ? dx2 : 0;

    if (dLeft !== 0 || dRight !== 0) {
      const x1Copy = this.x1;
      const x2Copy = this.x2;
      this.x1 += dLeft;
      this.x2 += dRight;

      this.checkBarPosition(x1Copy, x2Copy);
      this.updatePositions();
      this.updateArrows();
    }
  }

  public dragProgress(diff: number) {
    if (this.isProgressDraggable()) {
      this.progress = Math.max(this.progress + diff, 0);
      this.updateProgressPosition();
    }
  }

  private checkBarPosition(initialX: number, initialX2: number) {
    if (this.gantt.options.lockResize) {
      const parentTasks = this.gantt.tasks.filter(task => this.task.parentTransitiveDependencies.includes(task.id));
      const maxX = parentTasks.reduce((x, task) => Math.max(x, computeDistanceFromStart(this.gantt.options, this.gantt.settings, task.startDate)), 0);
      if (this.x1 < maxX) {
        if (initialX >= maxX) {
          const diff = maxX - this.x1;
          this.x1 += diff;
          if (this.x2 !== initialX2) {
            this.x2 += diff;
          }
        } else if (initialX > this.x1) {
          this.x1 = initialX;
          if (this.x2 !== initialX2) {
            this.x2 = initialX2;
          }
        }
      }
    }
  }

  public onKeyUp(event: KeyboardEvent) {
    [...this.fromArrowsSvgs, ...this.toArrowsSvgs].forEach(arrow => arrow.onKeyUp(event));
    if (event.key === 'Escape') {
      this.onEscapeKeyUp();
    }
  }

  private onEscapeKeyUp() {
    let positionUpdated = false;
    if (isNotNullOrUndefined(this.x1Drag)) {
      this.x1 = this.x1Drag;
      this.x1Drag = null;
      positionUpdated = true;
    }
    if (isNotNullOrUndefined(this.x2Drag)) {
      this.x2 = this.x2Drag;
      this.x2Drag = null;
      positionUpdated = true;
    }
    if (isNotNullOrUndefined(this.progressDrag)) {
      this.progress = this.progressDrag;
      this.progressDrag = null;
      positionUpdated = true;
    }
    if (isNotNullOrUndefined(this.yDrag)) {
      this.y = this.yDrag;
      this.yDrag = null;
      positionUpdated = true;
    }
    if (isNotNullOrUndefined(this.parentSvgDrag)) {
      this.parentSvg = this.parentSvgDrag;
      this.parentSvgDrag = null;
      this.task.swimlanes = this.parentSvg.swimlaneObjects;
    }
    if (positionUpdated) {
      this.updatePositions();
    }
  }

  public onDoubleClick(element: any) {
    const barElement = closestElement(`.${barWrapperClass}`, element);
    if (barElement === this.barWrapperElement) {
      this.gantt.onTaskDoubleClick(cleanGanttTask(this.task));
    }
  }

  public setYPosition(y: number) {
    if (this.y !== y) {
      this.y = y;
      this.updatePositions();
      this.updateArrows();
    }
  }

  public moveYPosition(offset: number) {
    this.setYPosition(this.y + offset);
  }

  public setYPositionWithParent(barsSvgs: BarsSvg, y: number) {
    if (this.isDraggableVertically()) {
      this.parentSvg = barsSvgs;
      this.setYPosition(y);
    }
  }
}
