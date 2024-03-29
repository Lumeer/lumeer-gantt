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

import {createSVG, setAttributes} from '../../utils/svg.utils';
import {GanttMode, GanttOptions} from '../../model/options';
import {DateScale, dayOfWeek, diffDates, hourOfDay, startOfToday} from '../../utils/date.utils';
import {DatesInfo, getColumnWidth, getDateInfo, getSettingsTableHeight, getTableHeight, stepHoursMultiplier} from '../../utils/gantt.utils';
import {GanttSvg} from '../gantt-svg';
import {copyArray} from '../../utils/common.utils';

const gridRowClass = 'grid-row';
const rowLineClass = 'row-line';
const tickClass = 'tick';
const todayClass = 'today-highlight';
const taskGridClasses = [gridRowClass, rowLineClass, tickClass, todayClass];
const todayMinWidth = 10;

export class GridSvg {

  private gridBackgroundElement: SVGElement;
  private gridRowsElements: SVGElement[] = [];
  private gridLinesElements: SVGElement[] = [];
  private gridTicksElements: SVGElement[] = [];
  private gridHighlightElement: SVGElement;

  private rowHeightsDrag: number[];

  constructor(private gantt: GanttSvg) {
  }

  public render() {
    this.renderGridBackground();
    this.renderGridRows();
    this.renderGridHeader();
    this.renderGridTicks();
    this.renderGridHighlights();
    this.renderDates();
  }

  private renderGridBackground() {
    this.gridBackgroundElement = createSVG('rect', {
      x: 0,
      y: 0,
      width: this.gantt.settings.tableWidth,
      height: getSettingsTableHeight(this.gantt.settings),
      class: 'grid-background',
    }, this.gantt.layers.grid);
  }

  private renderGridRows() {
    const rowsLayer = createSVG('g', {}, this.gantt.layers.grid);
    const linesLayer = createSVG('g', {}, this.gantt.layers.grid);

    let rowY = 0;

    for (let i = 0; i < this.gantt.settings.numberRows; i++) {
      const rowHeight = this.gantt.settings.rowHeights[i] || this.gantt.settings.defaultRowHeight;
      this.gridRowsElements[i] = createSVG('rect', {
          x: 0,
          y: rowY,
          width: this.gantt.settings.rowWidth,
          height: rowHeight,
          class: gridRowClass,
        }, rowsLayer
      );

      this.gridLinesElements[i] = createSVG('line', {
        x1: 0,
        y1: rowY + rowHeight,
        x2: this.gantt.settings.rowWidth,
        y2: rowY + rowHeight,
        class: rowLineClass
      }, linesLayer);

      rowY += rowHeight;
    }
  }

  private renderGridHeader() {
    createSVG('rect', {
      x: 0,
      y: 0,
      width: this.gantt.settings.rowWidth,
      height: this.gantt.settings.headerHeight,
      class: 'grid-header',
    }, this.gantt.layers.date);
  }

  private renderGridTicks() {
    let tickX = 0;
    let tickY = 0;

    const height = getTableHeight(this.gantt.settings.rowHeights);
    for (let date of this.gantt.settings.dates) {
      if (tickX > 0) {
        let tickClasses = tickClass;
        if (this.isTickThick(date)) {
          tickClasses += ' thick';
        }

        const gridTickElement = createSVG('rect', {
          x: tickX,
          y: tickY,
          height, class: tickClasses,
        }, this.gantt.layers.grid);
        this.gridTicksElements.push(gridTickElement);
      }

      tickX += getColumnWidth(this.gantt.options, date);
    }
  }

  private renderGridHighlights() {
    const steps = diffDates(startOfToday(), this.gantt.settings.minDate, DateScale.Hour) / this.gantt.settings.hoursStep;
    let x = steps * getColumnWidth(this.gantt.options);
    const y = 0;
    let width = getColumnWidth(this.gantt.options) / stepHoursMultiplier(this.gantt.options.viewMode);
    const height = getTableHeight(this.gantt.settings.rowHeights);

    if (width < todayMinWidth) {
      x -= (todayMinWidth - width) / 2;
      width = todayMinWidth;
    }

    this.gridHighlightElement = createSVG('rect', {
      x,
      y,
      width,
      height,
      class: todayClass,
    }, this.gantt.layers.grid);
  }

  private isTickThick(date: Date): boolean {
    switch (this.gantt.options.viewMode) {
      case GanttMode.Hour:
      case GanttMode.QuarterDay:
        // start of the date
        return hourOfDay(date) === 0;
      case GanttMode.HalfDay:
      case GanttMode.Day:
        // monday
        return dayOfWeek(date) === 0 && hourOfDay(date) === 0;
      case GanttMode.Week:
        // first week
        return date.getDate() >= 1 && date.getDate() < 8;
      case GanttMode.Month:
        // quarters
        return date.getMonth() % 3 === 0;
      default:
        return false;
    }
  }

  private renderDates() {
    for (let date of this.getDatesToDraw()) {
      createSVG('text', {
        x: date.lower.x,
        y: date.lower.y,
        class: 'lower-text',
        'font-size': `${this.gantt.options.headerFontSize}px`,
      }, this.gantt.layers.date, date.lower.text);

      const gridRect = this.gantt.layers.date.getBoundingClientRect();
      if (date.upper?.x < gridRect.width) {
        createSVG('text', {
          x: date.upper.x,
          y: date.upper.y,
          class: 'upper-text',
          'font-size': `${this.gantt.options.headerFontSize}px`,
        }, this.gantt.layers.date, date.upper.text);
      }
    }
  }

  private getDatesToDraw(): DatesInfo[] {
    let lastDate = null;
    let offsetX = 0;
    return this.gantt.settings.dates.map((date, index) => {
      const options = this.getComputedOptions(date);
      const info = getDateInfo(date, lastDate, index, options, offsetX);
      offsetX += options.columnWidth;
      lastDate = date;
      return info;
    });
  }

  private getComputedOptions(date: Date): GanttOptions {
    return {
      ...this.gantt.options,
      columnWidth: getColumnWidth(this.gantt.options, date),
      headerHeight: this.gantt.settings.headerHeight
    };
  }

  public onLineResized(index: number, diff: number) {
    this.updatePositions(index);
  }

  private updatePositions(index: number) {
    const height = getTableHeight(this.gantt.settings.rowHeights);
    setAttributes(this.gridBackgroundElement, {height});
    this.gridHighlightElement && setAttributes(this.gridHighlightElement, {height});
    this.gridTicksElements.forEach(element => setAttributes(element, {height}));

    let rowY = 0;

    for (let i = 0; i < this.gantt.settings.numberRows; i++) {
      const rowHeight = this.gantt.settings.rowHeights[i] || this.gantt.settings.defaultRowHeight;
      if (i >= index) {
        setAttributes(this.gridRowsElements[i], {y: rowY, height: rowHeight});
        setAttributes(this.gridLinesElements[i], {y1: rowY + rowHeight, y2: rowY + rowHeight})
      }

      rowY += rowHeight;
    }
  }

  public handleDragStart(element: any) {
    this.rowHeightsDrag = copyArray(this.gantt.settings.rowHeights);
  }

  public handleDragEnd(element: any) {
    this.rowHeightsDrag = null;
  }

  public onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onEscapeKeyUp();
    }
  }

  private onEscapeKeyUp() {
    if (this.rowHeightsDrag) {
      const firstChangedIndex = this.rowHeightsDrag.findIndex((height, index) => height !== this.gantt.settings.rowHeights[index]);
      if (firstChangedIndex !== -1) {
        this.gantt.settings.rowHeights = copyArray(this.rowHeightsDrag);
        this.updatePositions(firstChangedIndex);
      }
    }
  }

  public isTaskGridElement(element: any): boolean {
    return taskGridClasses.some(gridClass => element.classList.contains(gridClass));
  }

}
