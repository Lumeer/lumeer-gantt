import {GanttTask} from '../../../model/task';
import {GanttSvg} from '../../gantt-svg';
import {BarSvg} from './bar-svg';
import {computeDateByPosition, computeDistanceFromStart, computeNearestTickPosition, formatGanttDate} from '../../../utils/gantt.utils';
import {isNotNullOrUndefined} from '../../../utils/common.utils';
import {createRoundedRectPath, createSVG, setAttribute, setAttributes} from '../../../utils/svg.utils';
import {formatDate} from '../../../utils/date.utils';

const handleSize = 10;

export class MilestonesSvg {

  private handleGroup: SVGGraphicsElement;
  private handleTooltipElement: SVGElement;
  private handleTextElement: SVGElement;
  private handleElements: SVGElement[] = [];
  private elements: SVGElement[] = [];

  private draggingIndex: number;
  private endXDrag: number;
  private endXs: number[];
  private indexes: number[];

  constructor(public task: GanttTask,
              private gantt: GanttSvg,
              private groupElement: SVGGraphicsElement,
              private barSvg: BarSvg,
  ) {
    this.endXs = (this.task.milestoneDates || []).map(date => computeDistanceFromStart(this.gantt.options, this.gantt.settings, date));
    this.indexes = [...Array(this.endXs.length).keys()];
  }

  public get milestoneDates(): Date[] {
    return (this.endXs || []).map(date => computeDateByPosition(this.gantt.options, this.gantt.settings, date));
  }

  private computePosition(index: number): {x: number; width: number} {
    const minX = this.barSvg.x;
    const maxX = this.barSvg.getX2;
    const endX = this.endXs[index];
    const previousEndX = this.getPreviousEndX(index);
    const startX = index > 0 ? Math.max(previousEndX, minX) : minX;
    const width = startX < maxX && endX > minX ? Math.min(endX - startX, maxX - startX) : 0;
    return {x: startX, width};
  }

  private getPreviousEndX(index: number): number {
    let maxX = 0;
    for (let i = 0; i < index; i++) {
      maxX = Math.max(maxX, this.endXs[i]);
    }
    return maxX || this.barSvg.x;
  }

  public milestonesChanged(): boolean {
    return isNotNullOrUndefined(this.endXDrag) && isNotNullOrUndefined(this.draggingIndex) && this.endXs[this.draggingIndex] !== this.endXDrag;
  }

  public render() {
    this.renderBars();
    // handles are rendered in bar because of priority
  }

  private renderBars() {
    this.indexes.forEach(index => this.renderByIndex(index));
  }

  private renderByIndex(index: number) {
    const {x, width} = this.computePosition(index)
    const y = this.barSvg.getY;
    const height = this.barSvg.getHeight;
    const path = this.createPath(x, y, width, height);

    if (this.elements[index]) {
      setAttribute(this.elements[index], 'd', path);
    } else {
      const color = this.task.milestones[index].color;
      this.elements[index] = createSVG('path', {
        d: path,
        class: 'bar-milestone',
        style: color ? 'fill:' + color + '; ' : ''
      }, this.groupElement);
    }
  }

  private createPath(x: number, y: number, width: number, height: number): string {
    const x2 = x + width;
    const barX = this.barSvg.x;
    const barX2 = this.barSvg.getX2;
    const radius = this.gantt.options.barCornerRadius;

    if (width <= 0) {
      return ''
    } else if (x === barX && x2 === barX2) { // both corner should have radius
      return createRoundedRectPath(x, y, width, height, radius, radius, radius, radius);
    } else if (x === barX && x2 < barX2) { // left corner is with radius
      return createRoundedRectPath(x, y, width, height, 0, 0, radius, radius);
    } else if (x > barX && x2 === barX2) { // right corner is with radius
      return createRoundedRectPath(x, y, width, height, radius, radius, 0, 0);
    } else { // path without radius
      return createRoundedRectPath(x, y, width, height, 0, 0, 0, 0);
    }
  }

  public renderHandles() {
    if (this.isSomeMilestoneDraggable()) {
      if (!this.handleGroup) {
        this.handleGroup = createSVG('g', {
          class: 'bar-handle-milestones-group'
        }, this.groupElement);
      }

      this.indexes.forEach(index => this.renderHandleByIndex(index));
    }
  }

  private renderHandleByIndex(index: number) {
    if (index === this.draggingIndex) {
      return;
    }
    const endX = this.endXs[index];
    const {x: milestoneX, width: milestoneWidth} = this.computePosition(index);

    const width = handleSize;
    const x = milestoneX + milestoneWidth - width / 2;
    const y = this.barSvg.getY;
    const height = this.barSvg.getHeight;

    if (milestoneWidth <= 0 || endX > this.barSvg.endX) {
      this.handleElements[index]?.remove();
      this.handleElements[index] = null
    } else if (this.handleElements[index]) {
      setAttributes(this.handleElements[index], {x, y});
    } else {
      this.handleElements[index] = createSVG('rect', {
        x, y, width, height,
        class: 'bar-handle',
        style: 'fill: transparent',
      }, this.handleGroup);
    }
  }

  public isDragged(element: any): boolean {
    return this.draggedIndex(element) >= 0;
  }

  public handleDragStart(element: any) {
    this.draggingIndex = this.draggedIndex(element);
    this.endXDrag = this.endXs[this.draggingIndex];
    this.createTooltip();
  }

  private createTooltip() {
    this.handleTooltipElement = createSVG('rect', {
      rx: this.gantt.options.barCornerRadius,
      ry: this.gantt.options.barCornerRadius,
      class: 'milestone-tooltip',
    }, this.handleGroup);

    this.handleTextElement = createSVG('text', {
      class: 'bar-label',
      'font-size': `${this.gantt.options.fontSize}px`
    }, this.handleGroup, '');

    this.repositionTooltip();
  }

  private repositionTooltip() {
    const {x: startX, width} = this.computePosition(this.draggingIndex);
    const x = startX + width;
    const y = this.barSvg.getY - 10;
    const paddingX = 5;
    const date = computeNearestTickPosition(this.gantt.settings, x).date;
    const text = formatGanttDate(date, this.gantt.options)

    setAttributes(this.handleTextElement, {x, y})
    this.handleTextElement.innerHTML = text;

    const boundingRect = this.handleTextElement.getBoundingClientRect();
    setAttributes(this.handleTooltipElement, {
      height: boundingRect.height,
      width: boundingRect.width + 2 * paddingX,
      x: x - boundingRect.width / 2 - paddingX,
      y: y - boundingRect.height / 2,
    });
  }

  public handleDragEnd() {
    const draggingIndexCopy = this.draggingIndex
    this.draggingIndex = null;
    this.endXDrag = null;
    this.handleTextElement?.remove();
    this.handleTextElement = null;
    this.handleTooltipElement?.remove();
    this.handleTooltipElement = null;

    if (draggingIndexCopy >= 0) {
      // during dragging we are not updating handle because it can be deleted
      this.renderHandleByIndex(draggingIndexCopy);
    }
  }

  public resizeMilestone(element: any, dx: number, x: number) {
    if (dx === 0 || !this.isMilestoneDraggable(this.draggingIndex)) {
      return;
    }

    const previousEndX = this.endXs[this.draggingIndex - 1] ?? this.barSvg.x;
    const nextEndX = this.endXs[this.draggingIndex + 1] ?? this.barSvg.endX;
    const nearestTick = computeNearestTickPosition(this.gantt.settings, this.endXDrag + x);

    if (nearestTick.x > nextEndX || nearestTick.x < previousEndX) {
      return;
    }

    if (this.endXs[this.draggingIndex] !== nearestTick.x) {
      this.endXs[this.draggingIndex] = nearestTick.x;
      this.updateMilestones();
      this.repositionTooltip();
    }

  }

  public onEscapeKeyUp() {
    if (isNotNullOrUndefined(this.endXDrag)) {
      this.endXs[this.draggingIndex] = this.endXDrag;
      this.draggingIndex = null;
      this.endXDrag = null;
      this.updateMilestones();
    }
  }

  private updateMilestones() {
    this.task.milestoneDates = this.milestoneDates;
    this.task.milestones = (this.task.milestones || []).map((milestone, index) => ({...milestone, start: formatDate(this.task.milestoneDates[index], this.gantt.options.dateFormat)}))
    this.renderBars();
    this.renderHandles();
  }

  private draggedIndex(element: any): number {
    return this.handleElements.findIndex(handle => handle === element);
  }

  private isSomeMilestoneDraggable(): boolean {
    return this.indexes.some( index => this.isMilestoneDraggable(index));
  }

  private isMilestoneDraggable(index: number): boolean {
    return this.task.milestones?.[index]?.draggable && this.gantt.options.resizeMilestones && isNotNullOrUndefined(this.task.milestoneDates[index]);
  }

}