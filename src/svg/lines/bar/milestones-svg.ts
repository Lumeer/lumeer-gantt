import {GanttTask} from '../../../model/task';
import {GanttSvg} from '../../gantt-svg';
import {BarSvg} from './bar-svg';
import {computeDistanceFromStart} from '../../../utils/gantt.utils';
import {isNotNullOrUndefined} from '../../../utils/common.utils';
import {createRoundedRectPath, createSVG, setAttribute} from '../../../utils/svg.utils';

const handleSize = 10;
const handlePadding = 1;

export class MilestonesSvg {

  private handleGroups: SVGGraphicsElement[] = [];
  private handleElements: SVGElement[] = [];
  private handleMarkerElement: SVGElement[] = [];
  private elements: SVGElement[] = [];

  private draggingIndex: number;
  private xDrag: number;
  private x: number[];

  constructor(public task: GanttTask,
              private gantt: GanttSvg,
              private groupElement: SVGGraphicsElement,
              private barSvg: BarSvg,
  ) {
    this.x = (this.task.milestoneDates || []).map(date => computeDistanceFromStart(this.gantt.options, this.gantt.settings, date));
  }

  public milestonesChanged(): boolean {
    return isNotNullOrUndefined(this.xDrag) && isNotNullOrUndefined(this.draggingIndex);
  }

  private isMilestoneDraggable(index: number): boolean {
    return this.task.milestones?.[index]?.draggable && this.gantt.options.resizeMilestones && isNotNullOrUndefined(this.task.milestoneDates[index]);
  }

  public render() {
    this.x.forEach((x, index) => this.renderByIndex(x, index))
  }

  private renderByIndex(currentX: number, index: number) {
    const minX = this.barSvg.x;
    const maxX = this.barSvg.getX2;
    const x = index > 0 ? Math.max(this.x[index - 1], minX) : minX;
    const y = this.barSvg.getY;
    const width = x < maxX && currentX > minX ? Math.min(currentX - x, maxX - x) : 0;
    const height = this.barSvg.getHeight;
    const color = this.task.milestones[index].color;
    const path = this.createPath(x, y, width, height);

    if (this.elements[index]) {
      setAttribute(this.elements[index], 'd', path);
    } else {
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
    }else if (x === barX && x2 === barX2) { // both corner should have radius
      return createRoundedRectPath(x, y, width, height, radius, radius, radius, radius);
    } else if (x === barX && x2 < barX2) { // left corner is with radius
      return createRoundedRectPath(x, y, width, height, 0, 0, radius, radius);
    } else if (x > barX && x2 === barX2) { // right corner is with radius
      return createRoundedRectPath(x, y, width, height, radius, radius, 0, 0);
    } else { // path without radius
      return createRoundedRectPath(x, y, width, height, 0, 0, 0, 0);
    }
  }

}