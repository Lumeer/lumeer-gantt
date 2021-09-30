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

import {GridSvg} from './grid/grid-svg';
import {LinesSvg} from './lines/lines-svg';
import {GanttLayers, GanttLine, GanttSettings, GanttWrapper} from '../model/gantt';
import {GanttMode, GanttOptions} from '../model/options';
import {GanttTask, Task} from '../model/task';
import {
  addToDateByMode, computeDateByPosition,
  createGanttLines, createGanttOptions,
  createGanttTasksMap, generateId, getColumnWidth,
  getOrCreateWrapperElements, getSettingsTableHeight,
  stepHoursMultiplier, tasksChanged, setupRange, datePadding
} from '../utils/gantt.utils';
import {createSVG, getOffset, setAttributes} from '../utils/svg.utils';
import {arraySubtract, deepObjectsEquals, isNotNullOrUndefined} from '../utils/common.utils';
import {
  addToDate,
  DateScale, formatDate,
  getDaysInMonth,
  isAfter, isBefore,
  now,
  setupLanguage,
  startOfToday
} from '../utils/date.utils';
import {CreateArrowsSvg} from './drag/create-arrows-svg';
import {BarSvg} from './lines/bar/bar-svg';
import {CreateBarSvg} from './drag/create-bar-svg';
import {BarsSvg} from './lines/bar/bars-svg';
import {Gantt} from '../gantt';

export class GanttSvg {

  private container: HTMLDivElement;

  private headerContainer: HTMLDivElement;
  private attributesContainer: HTMLDivElement;
  private datesContainer: HTMLDivElement;

  private bodyContainer: HTMLDivElement;
  private tasksContainer: HTMLDivElement;
  private swimlanesContainer: HTMLDivElement;

  // main svg element
  public svgContainer: SVGElement;

  public svgDatesContainer: SVGElement;

  public gridSvg: GridSvg;
  public linesSvg: LinesSvg;

  public layers: GanttLayers = {};
  public options: GanttOptions = {};
  public settings: GanttSettings = {};
  public lines: GanttLine[] = [];

  public tasksMap: Record<string, GanttTask>;

  public taskIdsMap: Record<string, string[]>; // taskId to generatedIds

  private scrollSnapshotDate?: Date;

  private createDragArrowsSvg: CreateArrowsSvg;
  private createDragBarSvg: CreateBarSvg;

  public get tasks(): GanttTask[] {
    return Object.values(this.tasksMap || {});
  }

  public get preventEventListeners(): boolean {
    return !!this.createDragArrowsSvg || !!this.createDragBarSvg;
  }

  public get containsSwimLanes(): boolean {
    return isNotNullOrUndefined(this.linesSvg) ? this.linesSvg.containsSwimLanes : false;
  }

  constructor(wrapper: GanttWrapper, tasks: Task[], options: GanttOptions, private master: Gantt) {
    this.setupWrapper(wrapper);
    this.setupOptions(options);
    this.setupSwimLanes(tasks, this.options);
    this.setupAndRender();
    this.bindListeners();
    this.syncHorizontalScroll();
  }

  private setupWrapper(wrapper: GanttWrapper) {
    const {wrapperElement} = getOrCreateWrapperElements(wrapper);

    this.container = document.createElement('div');
    this.container.classList.add('gantt-container');
    wrapperElement.appendChild(this.container);

    this.headerContainer = document.createElement('div');
    this.headerContainer.classList.add('gantt-header-container');
    this.container.appendChild(this.headerContainer);

    this.attributesContainer = document.createElement('div');
    this.attributesContainer.classList.add('gantt-attributes-container');
    this.headerContainer.appendChild(this.attributesContainer);

    this.datesContainer = document.createElement('div');
    this.datesContainer.classList.add('gantt-dates-container');
    this.datesContainer.classList.add('invisible-scroll-y');
    this.headerContainer.appendChild(this.datesContainer);

    this.bodyContainer = document.createElement('div');
    this.bodyContainer.classList.add('gantt-body-container');
    this.container.appendChild(this.bodyContainer);

    this.swimlanesContainer = document.createElement('div');
    this.swimlanesContainer.classList.add('gantt-swimlanes-container');
    this.bodyContainer.appendChild(this.swimlanesContainer);

    this.tasksContainer = document.createElement('div');
    this.tasksContainer.classList.add('gantt-tasks-container');
    this.bodyContainer.appendChild(this.tasksContainer);

    this.svgContainer = createSVG('svg', {class: 'gantt'}, this.tasksContainer);
    this.svgDatesContainer = createSVG('svg', {class: 'gantt-header'}, this.datesContainer);
  }

  private setupOptions(options: GanttOptions) {
    this.setOptions(createGanttOptions(options));

    if (this.options.initialScroll) {
      this.scrollSnapshotDate = new Date(this.options.initialScroll);
    }
  }

  private setupSwimLanes(tasks: Task[], options: GanttOptions) {
    const {tasksMap, taskIdsMap} = createGanttTasksMap(tasks, options);
    this.tasksMap = tasksMap;
    this.taskIdsMap = taskIdsMap;

    this.lines = createGanttLines(Object.values(tasksMap), options);
  }

  public scrollToToday() {
    this.scrollToDate(addToDate(startOfToday(), 12, DateScale.Hour));
  }

  public changeViewMode(mode: GanttMode) {
    if (mode !== this.options.viewMode) {
      this.options.viewMode = mode;
      this.snapshotDate();
      this.setupAndRender();
    }
  }

  public changeOptions(options: GanttOptions) {
    const mergedOptions = createGanttOptions(options);
    this.refreshGantt(this.tasks, mergedOptions);
  }

  public changeTasks(tasks: Task[], options?: GanttOptions) {
    const mergedOptions = options && createGanttOptions(options) || this.options;
    if (tasksChanged(this.tasks, tasks)) {
      this.refreshGantt(tasks, mergedOptions, true);
    } else {
      this.refreshGantt(this.tasks, mergedOptions);
    }
  }

  private refreshGantt(tasks: Task[], options: GanttOptions, force?: boolean) {
    if (force || !deepObjectsEquals(this.options, options)) {
      this.setOptions(options);
      if (options.initialScroll) {
        this.scrollSnapshotDate = new Date(options.initialScroll);
      } else if (!this.viewportWidthChangedALot(this.tasks, tasks, options)) {
        this.snapshotDate();
      }
      this.setupSwimLanes(tasks, this.options);
      this.setupAndRender();
    }
  }

  private setOptions(options: GanttOptions) {
    this.options = options;
    setupLanguage(options.language);
  }

  private viewportWidthChangedALot(previousTasks: Task[], currentTasks: Task[], options: GanttOptions): boolean {
    if (previousTasks.length === 0 && currentTasks.length > 0) {
      return true;
    }
    if (!this.settings.minDate || !this.settings.maxDate) {
      return true;
    }

    const currentGanttTasksMap = createGanttTasksMap(currentTasks, options).tasksMap;
    const {minDate, maxDate} = setupRange(Object.values(currentGanttTasksMap), options);

    const {value, scale} = datePadding(options.viewMode);
    const previousMinDate = addToDate(this.settings.minDate, -value, scale);
    const previousMaxDate = addToDate(this.settings.maxDate, value, scale);
    return (minDate.getTime() < previousMinDate.getTime() || maxDate.getTime() > previousMaxDate.getTime())
  }

  public removeTask(taskToRemove: Task) {
    const tasks = this.tasks.filter(task => task.id !== taskToRemove.id);
    this.refreshGantt(tasks, this.options, true);
  }

  private snapshotDate() {
    this.scrollSnapshotDate = this.currentMiddleDate();
  }

  private currentMiddleDate(): Date {
    const svgParent = this.svgContainer?.parentElement;
    if (!svgParent) {
      return null;
    }
    const centerPosition = svgParent.scrollLeft + svgParent.clientWidth / 2;
    const part = centerPosition / svgParent.scrollWidth;

    const datesDiff = this.settings.maxDate.getTime() - this.settings.minDate.getTime();
    const millisDiff = datesDiff * part;
    return addToDate(this.settings.minDate, millisDiff, DateScale.Millisecond);
  }

  private setupAndRender() {
    this.setupSettings();
    this.render();
  }

  private setupSettings() {
    this.setupRange();
    this.setupDateValues();
    this.setupDefaults();
  }

  private setupRange() {
    const {minDate, maxDate} = setupRange(this.tasks, this.options);
    this.settings.minDate = minDate;
    this.settings.maxDate = maxDate;
  }

  private setupDateValues() {
    this.settings.hoursStep = 24 * stepHoursMultiplier(this.options.viewMode);
    this.settings.dates = [];
    let currentDate: Date = this.settings.minDate;

    while (currentDate.getTime() < this.settings.maxDate.getTime()) {
      this.settings.dates.push(currentDate);
      currentDate = addToDateByMode(currentDate, this.options.viewMode, this.settings.hoursStep);
    }

    let lastX = 0;
    this.settings.taskTicks = this.settings.dates.reduce((arr, date) => {
      arr.push(...this.divideDateIntoTaskTicks(date, lastX));
      lastX += getColumnWidth(this.options, date);
      return arr;
    }, []);
  }

  private divideDateIntoTaskTicks(date: Date, lastX: number): { date: Date, x: number }[] {
    const divider = this.getTaskTicksDivider(date);
    const tickWidth = getColumnWidth(this.options, date) / divider;
    const ticks = [];
    for (let i = 0; i < divider; i++) {
      ticks.push({date: this.getTickDate(date, i), x: lastX + i * tickWidth});
    }
    return ticks;
  }

  private getTaskTicksDivider(date: Date): number {
    if (this.options.viewMode === GanttMode.Week) {
      return 7; // days
    } else if (this.options.viewMode === GanttMode.Year) {
      return 12; // months
    } else if (this.options.viewMode === GanttMode.Month) {
      return getDaysInMonth(date); // days
    }

    return 1;
  }

  private getTickDate(date: Date, divider: number): Date {
    if (divider === 0) {
      return date;
    }

    const scale = this.options.viewMode === GanttMode.Year ? DateScale.Month : DateScale.Day;
    return addToDate(date, divider, scale);
  }

  private setupDefaults() {
    this.settings.numberRows = this.countNumberRows();
    this.settings.headerHeight = this.options.headerHeight + this.options.padding;
    this.settings.rowHeights = [];
    this.settings.rowWidth = this.computeRowWidth();

    this.settings.defaultRowHeight = this.options.barHeight + this.options.padding;
    this.settings.tableWidth = this.settings.rowWidth;
  }

  private computeRowWidth(): number {
    return this.settings.dates.reduce((sum, date) => sum + getColumnWidth(this.options, date), 0);
  }

  private countNumberRows(): number {
    return (this.lines || []).length;
  }

  private render() {
    this.clear();
    this.setupLayers();
    this.renderGridAndLines();
    this.updateSize();
    this.setScrollPosition();
  }

  private clear() {
    this.svgContainer.innerHTML = '';
    Object.values(this.layers || {}).forEach(layer => layer?.remove());
  }

  private setupLayers() {
    this.layers = {};
    this.layers.grid = createSVG('g', {class: 'grid'}, this.svgContainer);
    this.layers.date = createSVG('g', {class: 'date'}, this.svgDatesContainer);
    this.layers.arrow = createSVG('g', {class: 'arrow'}, this.svgContainer);
    this.layers.bar = createSVG('g', {class: 'bar'}, this.svgContainer);
    this.layers.handle = createSVG('g', {class: 'handle'}, this.svgContainer);
    this.layers.swimlanes = createSVG('svg', {class: 'gantt-swimlanes'}, this.swimlanesContainer);
    this.layers.attributes = createSVG('svg', {class: 'gantt-attributes'}, this.attributesContainer);

    this.setupHelperDefinitions();
  }

  private setupHelperDefinitions() {
    // clip-path for avatars in swimlanes
    const defs = createSVG('defs', {}, this.layers.swimlanes);
    const clipPath = createSVG('clipPath', {id: 'clip', clipPathUnits: 'objectBoundingBox'}, defs);
    createSVG('circle', {cx: '.5', cy: '.5', r: '.5'}, clipPath);
  }

  private renderGridAndLines() {
    this.linesSvg = new LinesSvg(this);
    this.linesSvg.render();

    this.gridSvg = new GridSvg(this);
    this.gridSvg.render();
  }

  public onLineResized(index: number, diff: number) {
    this.gridSvg.onLineResized(index, diff);

    this.updateWrapperHeight();
  }

  private updateWrapperHeight() {
    setAttributes(this.svgDatesContainer, {height: this.settings.headerHeight});
    setAttributes(this.svgContainer, {height: getSettingsTableHeight(this.settings)});
  }

  private updateSize() {
    setAttributes(this.svgContainer, {width: '100%'});

    const currentWidth = this.svgContainer.getBoundingClientRect().width;
    const actualWidth = this.settings.rowWidth;
    const attributes = {height: getSettingsTableHeight(this.settings)};
    if (currentWidth < actualWidth) {
      attributes['width'] = String(actualWidth);
    }
    setAttributes(this.svgContainer, attributes);
    setAttributes(this.svgDatesContainer, {...attributes, height: this.settings.headerHeight});
  }

  private setScrollPosition() {
    if (this.scrollSnapshotDate) {
      this.scrollToDate(this.scrollSnapshotDate);
      this.scrollSnapshotDate = null;
    } else {
      const firstTaskInFuture = this.findFirstTaskInFuture();
      if (firstTaskInFuture) {
        this.scrollToDate(firstTaskInFuture.startDate);
        return;
      }

      const firstTaskInPast = this.findFirstTaskInPast();
      if (firstTaskInPast) {
        this.scrollToDate(firstTaskInPast.endDate);
        return;
      }

      this.scrollToToday();
    }
  }

  private findFirstTaskInFuture(): GanttTask {
    const nowDate = now();
    let firstTask: GanttTask = null;
    this.tasks.forEach(task => {
      if (isAfter(task.startDate, nowDate) && (!firstTask || isBefore(task.startDate, firstTask.startDate))) {
        firstTask = task;
      }
    });

    return firstTask;
  }

  private findFirstTaskInPast(): GanttTask {
    const nowDate = now();
    let firstTask: GanttTask = null;
    this.tasks.forEach(task => {
      if (isBefore(task.endDate, nowDate) && (!firstTask || isAfter(task.endDate, firstTask.endDate))) {
        firstTask = task;
      }
    });

    return firstTask;
  }

  private scrollToDate(date: Date) {
    const scrollWidth = this.tasksContainer.scrollWidth;
    const datesDiff = this.settings.maxDate.getTime() - this.settings.minDate.getTime();
    const snapDiff = date.getTime() - this.settings.minDate.getTime();

    const scrollCenter = scrollWidth / datesDiff * snapDiff;

    this.scrollTo(Math.max(0, scrollCenter - this.tasksContainer.clientWidth / 2));
  }

  private scrollTo(val: number) {
    this.tasksContainer.scrollLeft = val;
    this.datesContainer.scrollLeft = val;
  }

  private onDragStart(element: any, event?: any) {
    if (event?.target && this.options.createTasks && this.gridSvg.isTaskGridElement(event.target)) {
      const offset = getOffset(event);
      const barsSvg = this.linesSvg.findBarsSvgByY(offset.y);
      if (barsSvg) {
        this.createDragBar(barsSvg, offset.x, offset.y);
      }
    } else {
      this.linesSvg?.handleDragStart(element);
      this.gridSvg?.handleDragStart(element);
    }
  }

  private onDrag(element: any, dx: number, dy: number, x: number, y: number) {
    this.linesSvg?.handleDrag(element, dx, dy, x, y);
  }

  private onDragEnd(element: any) {
    this.linesSvg?.handleDragEnd(element);
    this.gridSvg?.handleDragEnd(element);
  }

  private onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onEscapeKeyUp();
    }
    this.linesSvg?.onKeyUp(event);
    this.gridSvg?.onKeyUp(event);
    this.updateWrapperHeight();
  }

  private onEscapeKeyUp() {
    if (this.createDragArrowsSvg) {
      this.createDragArrowsSvg.destroy();
      this.createDragArrowsSvg = null;
    }

    if (this.createDragBarSvg) {
      this.createDragBarSvg.destroy();
      this.createDragBarSvg = null;
    }
  }

  private bindListeners() {
    document.addEventListener('mousedown', startDrag);
    document.addEventListener('touchstart', startDrag);

    const _this = this;
    let offsetX, offsetY, targetElement, currentOffsetX, currentOffsetY;

    function startDrag(event: any) {
      if (_this.preventEventListeners) {
        return;
      }

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('mouseleave', endDrag);
      document.addEventListener('touchmove', drag);
      document.addEventListener('touchend', endDrag);
      document.addEventListener('touchleave', endDrag);
      document.addEventListener('touchcancel', endDrag);

      offsetX = currentOffsetX = event.clientX;
      offsetY = currentOffsetY = event.clientY;
      targetElement = event.target;

      _this.onDragStart(targetElement, event);
    }

    function drag(event: any) {
      event.preventDefault();

      if (_this.preventEventListeners) {
        return;
      }

      const dx = event.clientX - currentOffsetX;
      const dy = event.clientY - currentOffsetY;

      currentOffsetX = event.clientX;
      currentOffsetY = event.clientY;

      _this.onDrag(targetElement, dx, dy, event.clientX - offsetX, event.clientY - offsetY);
    }

    function endDrag(event: any) {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('mouseleave', endDrag);
      document.removeEventListener('touchmove', drag);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('touchleave', endDrag);
      document.removeEventListener('touchcancel', endDrag);

      _this.onDragEnd(targetElement);
    }

    document.addEventListener('keyup', keyUp);

    function keyUp(event: KeyboardEvent) {
      _this.onKeyUp(event);
      if (event.key === 'Escape') {
        endDrag(event);
      }
    }

    document.addEventListener('dblclick', doubleClick);

    function doubleClick(event) {
      _this.onDoubleClick(event);
    }

    this.tasksContainer.addEventListener('scroll', () => this.onTaskContainerScrolled());
  }

  private syncHorizontalScroll() {
    let activeElement: HTMLElement;

    [this.datesContainer, this.tasksContainer]
      .forEach(element => {
        element.addEventListener('mouseenter', event => activeElement = event.target as HTMLElement);

        element.addEventListener('scroll', event => {
          const target = event.target as HTMLElement;

          if (target !== this.datesContainer) {
            this.datesContainer.scrollLeft = target.scrollLeft;
          }
          if (target !== this.tasksContainer) {
            this.tasksContainer.scrollLeft = target.scrollLeft;
          }
        })
      })
  }

  private onTaskContainerScrolled() {
    const snapshotDate = this.currentMiddleDate();
    if (snapshotDate) {
      this.master.onScrolledHorizontally?.(snapshotDate.getTime());
    }
  }

  private onDoubleClick(event: any) {
    if (this.options.createTasks && this.gridSvg.isTaskGridElement(event.target)) {
      const offset = getOffset(event);
      const barsSvg = this.linesSvg.findBarsSvgByY(offset.y);
      if (barsSvg) {
        this.createDragBar(barsSvg, offset.x, offset.y);
      }
    } else {
      this.linesSvg.onDoubleClick(event.target);
    }
  }

  public createArrows(fromBars: BarSvg[], toBars: BarSvg[]) {
    this.linesSvg.createArrows(fromBars, toBars);
  }

  public createDragArrow(bar: BarSvg) {
    if (!this.createDragArrowsSvg) {
      const barIds = arraySubtract(bar.task.allowedDependencies, bar.task.dependencies);
      const allowedBarIds = arraySubtract(barIds, bar.task.parentDependencies);
      const possibleToBars = Object.values(this.linesSvg.barSvgsMap || {})
        .filter(bar => allowedBarIds.includes(bar.task.id));

      this.createDragArrowsSvg = new CreateArrowsSvg(bar, possibleToBars, this);
    }
  }

  public destroyDragArrow() {
    this.createDragArrowsSvg = null;
  }

  public createDragBar(barsSvg: BarsSvg, x: number, y: number) {
    if (!this.createDragBarSvg) {
      this.createDragBarSvg = new CreateBarSvg(this, barsSvg, x, y);
      this.onDragStart(this.createDragBarSvg);
    }
  }

  public createBar(barsSvg: BarsSvg, x1: number, x2: number, y: number) {
    const task = this.createGanttTask(x1, x2);
    this.tasksMap[task.id] = task;
    this.taskIdsMap[task.id] = [task.id];
    barsSvg.createBarSvg(task, y);
  }

  private createGanttTask(x1: number, x2: number): GanttTask {
    const startDate = computeDateByPosition(this.options, this.settings, x1);
    const endDate = computeDateByPosition(this.options, this.settings, x2);
    const start = formatDate(startDate, this.options.dateFormat);
    const end = formatDate(endDate, this.options.dateFormat);

    return {
      id: generateId("new"),
      taskId: null,
      name: '',
      startDate, endDate, start, end,
      editable: false,
      parentDependencies: [],
      dependencies: [],
      allowedDependencies: [],
      parentTransitiveDependencies: [],
      transitiveDependencies: [],
      swimlanes: [],
      progress: null,
      endDrag: false,
      startDrag: false,
      progressDrag: false,
    }
  }

  public destroyDragBar() {
    this.createDragBarSvg = null;
  }

  public onSwimlaneResized(index: number, width: number) {
    this.master.onSwimlaneResized?.(index, width);
  }

  public onTaskChanged(task: Task) {
    this.master.onTaskChanged?.(task);
  }

  public onTaskDependencyAdded(fromTask: Task, toTask: Task) {
    this.master.onTaskDependencyAdded?.(fromTask, toTask);
  }

  public onTaskDependencyRemoved(fromTask: Task, toTask: Task) {
    this.master.onTaskDependencyRemoved?.(fromTask, toTask);
  }

  public onTaskCreated(task: Task) {
    this.master.onTaskCreated?.(task);
  }

  public onTaskDoubleClick(task: Task) {
    this.master.onTaskDetail?.(task);
  }

}
