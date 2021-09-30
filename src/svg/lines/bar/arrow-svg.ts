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

import {BarSvg} from './bar-svg';
import {createDeleteIconElement, createSVG, getOffset, setAttribute} from '../../../utils/svg.utils';
import {GanttSvg} from '../../gantt-svg';
import {createArrowPath} from '../../../utils/arrow.utils';

export const arrowClass = 'arrow';

export class ArrowSvg {

  private arrowElement: SVGElement;
  private arrowClickableElement: SVGElement;
  private arrowClickListener: any;
  private documentClickListener: any;

  private deleteIconElement: SVGElement;
  private deleteClickListener: any;

  private path: string;
  private pathDrag: string;

  constructor(private gantt: GanttSvg,
              public fromBar: BarSvg,
              public toBar: BarSvg) {
  }

  public get drawsFromEnd(): boolean {
    return this.fromBar.endEndpointCX < this.toBar.startEndpointCX;
  }

  public get drawsFromStart(): boolean {
    return !this.drawsFromEnd;
  }

  public render() {
    this.calculatePath();
    this.renderElements();
  }

  private calculatePath() {
    this.path = createArrowPath(this.fromBar, this.toBar, this.gantt);
  }

  private renderElements() {
    this.arrowElement = this.createElementWithClass(arrowClass);
    if (this.fromBar.task.editable && this.toBar.task.editable) {
      this.arrowClickableElement = this.createElementWithClass('arrow-clickable');
      this.arrowClickListener = (event) => this.onArrowClick(event);
      this.arrowClickableElement.addEventListener('click', this.arrowClickListener);
    }
  }

  private onArrowClick(event: MouseEvent) {
    if (this.deleteIconElement) {
      this.resetArrow();
      return;
    }

    if (!this.gantt.preventEventListeners) {
      this.setActive();
      this.gantt.linesSvg.setArrowActive(this.fromBar, this.toBar, true);
      const offset = getOffset(event);
      this.deleteIconElement = createDeleteIconElement(offset.x + 10, offset.y + 5, this.gantt.layers.handle);
      this.deleteClickListener = () => this.deleteArrow();
      this.deleteIconElement.addEventListener('click', this.deleteClickListener);
    }

    setTimeout(() => {
      this.documentClickListener = () => this.resetArrow();
      document.addEventListener('click', this.documentClickListener);
    });
  }

  public setActive() {
    if (!this.arrowElement.classList.contains('active')) {
      this.arrowElement.classList.add('active');
    }
  }

  public removeActive() {
    this.arrowElement.classList.remove('active');
  }

  private resetArrow() {
    this.deleteIconElement?.removeEventListener('click', this.deleteClickListener);
    this.deleteIconElement?.remove();
    this.deleteIconElement = null;
    this.deleteClickListener = null;
    this.removeActive();
    this.gantt.linesSvg.setArrowActive(this.fromBar, this.toBar, false);
    document.removeEventListener('click', this.documentClickListener);
  }

  private deleteArrow() {
    this.resetArrow();
    this.gantt.linesSvg.deleteArrow(this.fromBar, this.toBar);
  }

  private createElementWithClass(className: string): SVGElement {
    return createSVG('path', {
      d: this.path,
      class: className,
    }, this.gantt.layers.arrow);
  }

  public updatePosition() {
    this.calculatePath();
    this.updateElements();
  }

  private updateElements() {
    this.arrowElement && setAttribute(this.arrowElement, 'd', this.path);
    this.arrowClickableElement && setAttribute(this.arrowClickableElement, 'd', this.path);
  }

  public handleDragStart(element: any) {
    this.pathDrag = this.path;
  }

  public handleDragEnd(element: any) {
    this.pathDrag = null;
  }

  public onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onEscapeKeyUp();
    }
  }

  private onEscapeKeyUp() {
    if (this.pathDrag) {
      if (this.path !== this.pathDrag) {
        this.path = this.pathDrag;
        this.pathDrag = null;
        this.updateElements();
      }
    }
  }

  public destroy() {
    if (this.arrowElement) {
      this.arrowElement.remove();
      this.arrowElement = null;
    }
    if (this.arrowClickableElement) {
      this.arrowClickableElement.remove();
      this.arrowClickableElement = null;
    }
    if (this.deleteIconElement) {
      this.deleteIconElement.remove();
      this.deleteIconElement = null;
    }

    this.arrowClickListener = null;
    this.deleteClickListener = null;

    document.removeEventListener('click', this.documentClickListener);
    this.documentClickListener = null;

  }
}
