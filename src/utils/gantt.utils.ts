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

import {defaultOptions, GanttMode, GanttOptions, GanttSwimlaneInfo} from '../model/options';
import {addToDate, DateScale, diffDates, formatDate, getDaysInMonth, parseDate} from './date.utils';
import {GanttTask, Task, taskProperties} from '../model/task';
import {GanttLine, GanttSettings, GanttSwimlane, GanttWrapper} from '../model/gantt';
import {
    arrayContainsSameItems,
    completeArrayWithNulls,
    isArray,
    mergeFlatObjects,
    uniqueValues
} from './common.utils';

export function createGanttOptions(options: GanttOptions): GanttOptions {
    const mergedOptions = mergeFlatObjects<GanttOptions>(defaultOptions, options);
    mergedOptions.headerHeight = Math.max(mergedOptions.headerHeight, 30);
    mergedOptions.columnWidth = Math.max(mergedOptions.columnWidth, 20);
    mergedOptions.barHeight = Math.max(mergedOptions.barHeight, 10);
    return mergedOptions;
}

export interface DatesInfo {
    lower: DateInfo;
    upper: DateInfo;
}

export interface DateInfo {
    x: number;
    y: number;
    text: string;
}

export function getDateInfo(date: Date, previousDate: Date | null, index: number, options: GanttOptions, offsetX: number): DatesInfo {
    const basePosition = {
        x: offsetX,
        lowerY: options.headerHeight - options.padding / 2,
        upperY: options.headerHeight / 2 - options.padding / 2
    };

    let lowerFormat = null;
    let upperFormat = null;
    let lowerXOffset = 0;
    let upperXOffset = 0;

    switch (options.viewMode) {
        case GanttMode.QuarterDay: {
            lowerFormat = 'HH';
            upperFormat = !previousDate || date.getDate() !== previousDate.getDate() ?
                index % 16 === 0 ? 'D MMM YYYY' : 'D MMM' : '';
            lowerXOffset = index === 0 ? options.columnWidth / 4 : 0;
            upperXOffset = options.columnWidth * 2;
            break;
        }
        case GanttMode.HalfDay: {
            lowerFormat = 'HH';
            upperFormat = !previousDate || date.getDate() !== previousDate.getDate() ?
                index % 8 === 0 ? 'D MMM YYYY' : 'D MMM' : '';
            lowerXOffset = index === 0 ? options.columnWidth / 4 : 0;
            upperXOffset = options.columnWidth;
            break;
        }
        case GanttMode.Day: {
            lowerFormat = 'D';
            upperFormat = !previousDate || date.getMonth() !== previousDate.getMonth() ? 'MMMM YYYY' : '';
            lowerXOffset = options.columnWidth / 2;
            upperXOffset = options.columnWidth * (getDaysInMonth(date) - 2) / 2;
            break;
        }
        case GanttMode.Week: {
            lowerFormat = !previousDate || date.getMonth() !== previousDate.getMonth() ? 'D MMM' : 'D';
            upperFormat = !previousDate || date.getMonth() !== previousDate.getMonth() ? 'MMMM YYYY' : '';
            lowerXOffset = index === 0 ? options.columnWidth / 8 : 0;
            upperXOffset = options.columnWidth * 2;
            break;
        }
        case GanttMode.Month: {
            lowerFormat = 'MMMM';
            upperFormat = index % 3 === 0 ? 'YYYY' : '';
            lowerXOffset = options.columnWidth / 2;
            upperXOffset = options.columnWidth / 2;
            break;
        }
        case GanttMode.Year: {
            lowerFormat = 'YYYY';
            lowerXOffset = options.columnWidth / 2;
            break;
        }

    }

    const lowerText = lowerFormat && formatDate(date, lowerFormat);
    const upperText = upperFormat && formatDate(date, upperFormat);
    return {
        upper: upperText && {text: upperText, y: basePosition.upperY, x: basePosition.x + upperXOffset},
        lower: {text: lowerText, y: basePosition.lowerY, x: basePosition.x + lowerXOffset}
    }
}

export function computeDistanceFromStart(options: GanttOptions, settings: GanttSettings, destinationDate: Date): number {
    if (options.viewMode === GanttMode.Month) {
        let x = 0;
        for (const date of settings.dates) {
            const width = getColumnWidth(options, date);
            if (date.getTime() > destinationDate.getTime()) {
                const hoursStep = settings.hoursStep / 30 * getDaysInMonth(date);
                const lastPartSteps = diffDates(destinationDate, date, DateScale.Hour) / hoursStep;
                return x + (lastPartSteps * width);
            }
            x += width;
        }

        return x;
    }
    const steps = diffDates(destinationDate, settings.minDate, DateScale.Hour) / settings.hoursStep;
    return steps * getColumnWidth(options);
}

export function computeDateByPosition(options: GanttOptions, settings: GanttSettings, position: number): Date {
    if (options.viewMode === GanttMode.Month) {
        let x = 0;
        for (const date of settings.dates) {
            const width = getColumnWidth(options, date);
            if (x + width > position) {
                const hoursStep = settings.hoursStep / 30 * getDaysInMonth(date);
                const steps = (position - x) / width * hoursStep;
                return addToDate(date, steps, DateScale.Hour);
            }
            x += width;
        }

        return settings.maxDate;
    }

    const columnWidth = getColumnWidth(options);
    const steps = position / columnWidth * settings.hoursStep;
    return addToDate(settings.minDate, steps, DateScale.Hour);
}

export function getColumnWidth(options: GanttOptions, date?: Date): number {
    const width = options.columnWidth * columnWidthMultiplier(options.viewMode);
    if (options.viewMode === GanttMode.Month && date) {
        const daysInMonth = getDaysInMonth(date);
        return width / 30 * daysInMonth;
    }
    return width;
}


function columnWidthMultiplier(mode: GanttMode): number {
    switch (mode) {
        case GanttMode.Week:
        case GanttMode.Month:
            return 4;
        case GanttMode.Year:
            return 12;
        default:
            return 1;
    }
}

export function stepHoursMultiplier(mode: GanttMode): number {
    switch (mode) {
        case GanttMode.QuarterDay:
            return 1 / 4;
        case GanttMode.HalfDay:
            return 1 / 2;
        case GanttMode.Week:
            return 7;
        case GanttMode.Month:
            return 30;
        case GanttMode.Year:
            return 365;
        default:
            return 1;
    }
}

export function addToDateByMode(date: Date, mode: GanttMode, step: number): Date {
    switch (mode) {
        case GanttMode.Year:
            return addToDate(date, 1, DateScale.Year);
        case GanttMode.Month:
            return addToDate(date, 1, DateScale.Month);
        default:
            return addToDate(date, step, DateScale.Hour);
    }
}

export function datePadding(mode: GanttMode): { value: number, scale: DateScale } {
    switch (mode) {
        case GanttMode.QuarterDay:
        case GanttMode.HalfDay:
            return {value: 1, scale: DateScale.Month};
        case GanttMode.Month:
            return {value: 1, scale: DateScale.Year};
        case GanttMode.Year:
            return {value: 2, scale: DateScale.Year};
        default:
            return {value: 2, scale: DateScale.Month};
    }
}

export function getSettingsTableHeight(settings: GanttSettings): number {
    return getTableHeight(settings.headerHeight, settings.rowHeights);
}

export function getTableHeight(headerHeight: number, rowHeights: number[]): number {
    return (headerHeight || 0) + (rowHeights || []).reduce((s, h) => s + h, 0);
}

export function generateId(value?: string): string {
    return (
        (value || '') +
        '_' +
        Math.random()
            .toString(36)
    );
}

interface Swimlanes {
    lines: Swimlane[];
    otherTasks: GanttTask[];
    maxLevel: number;
}

interface Swimlane {
    value: string;
    children?: Swimlane[];
    tasks?: GanttTask[];
}

const defaultNumLines = 5;

export function createGanttLines(tasks: GanttTask[], options: GanttOptions): GanttLine[] {
    const swimlanes = createSwimlanes(tasks || [], options.swimlaneInfo || []);
    if ((swimlanes.lines || []).length === 0) {
        const lines = swimlanes.otherTasks.map(task => ({swimlanes: [], tasks: [task]}));
        for (let i = lines.length; i < defaultNumLines; i++) {
            lines.push({swimlanes: [], tasks: []});
        }
        return lines;
    }

    const ganttLines: GanttLine[] = [];
    swimlanes.lines.forEach(line => iterateGanttLines(line, ganttLines, [], swimlanes.maxLevel));

    if (swimlanes.otherTasks.length > 0) {
        ganttLines.push({
            swimlanes: completeArrayWithNulls<GanttSwimlane>(null, swimlanes.maxLevel),
            tasks: swimlanes.otherTasks
        })
    }

    return ganttLines;
}

function iterateGanttLines(line: Swimlane, ganttLines: GanttLine[], ganttSwimLanes: GanttSwimlane[], maxLevel: number) {
    const id = generateId(line.value);

    const newSwimLanes = [...ganttSwimLanes, {id, value: line.value}];

    (line.children || []).forEach(l => iterateGanttLines(l, ganttLines, newSwimLanes, maxLevel));

    if ((line.tasks || []).length > 0) {
        ganttLines.push({
            swimlanes: completeArrayWithNulls<GanttSwimlane>(newSwimLanes, maxLevel),
            tasks: line.tasks
        })
    }

}

export function createGanttTasksMap(tasks: Task[], options: GanttOptions): { tasksMap: Record<string, GanttTask>, taskIdsMap: Record<string, string[]> } {
    const taskIdsMap: Record<string, string[]> = {};
    const tasksMap = (tasks || []).reduce<Record<string, GanttTask>>((map, task) => {
        const startDate = parseDate(task.start, options.dateFormat);
        const endDate = parseDate(task.end, options.dateFormat);

        if (!startDate || !endDate) {
            return map;
        }

        const progress = task.progress || 0;

        const generatedId = generateId(task.id);
        if (taskIdsMap[task.id]) {
            taskIdsMap[task.id].push(generatedId);
        } else {
            taskIdsMap[task.id] = [generatedId];
        }

        map[generatedId] = {
            ...task,
            id: generatedId,
            taskId: task.id,
            startDate,
            endDate,
            parentDependencies: [],
            transitiveDependencies: [],
            parentTransitiveDependencies: [],
            progress
        };
        return map;
    }, {});

    Object.values(tasksMap).forEach(task => {
        task.dependencies = (task.dependencies || []).reduce((all, dep) => {
            if (taskIdsMap[dep]) {
                all.push(...taskIdsMap[dep]);
            }
            return all;
        }, []);
        task.allowedDependencies = (task.allowedDependencies || []).reduce((all, dep) => {
            if (taskIdsMap[dep]) {
                all.push(...taskIdsMap[dep]);
            }
            return all;
        }, []);
        task.dependencies.forEach(id => tasksMap[id].parentDependencies.push(task.id))
    });

    refreshTasksTransitiveDependencies(tasksMap);

    return {tasksMap, taskIdsMap};
}

export function refreshTasksTransitiveDependencies(tasksMap: Record<string, GanttTask>) {
    Object.values(tasksMap).forEach(task => {
        task.transitiveDependencies = getAllDependencies(task, tasksMap);
        task.parentTransitiveDependencies = getAllDependencies(task, tasksMap, true);
    });
}

function createSwimlanes(tasks: GanttTask[], info: GanttSwimlaneInfo[]): Swimlanes {
    const otherTasks = [];
    let maxLevel = 0;
    const lines = (tasks || []).reduce<Swimlane[]>((arr, task) => {
        if ((task.swimlanes || []).some(value => !!value)) {
            let currentMaxLevel = 1;
            let parentSwimLane: Swimlane;
            if (!info[0] || !info[0].static) {
                parentSwimLane = arr.find(s => s.value === task.swimlanes[0] || '');
            }

            const isLastSwimLane = !task.swimlanes.slice(1).some(sl => !!sl);
            if (!parentSwimLane) {
                parentSwimLane = {
                    value: task.swimlanes[0] || '',
                    children: [],
                    tasks: isLastSwimLane ? [task] : []
                };
                arr.push(parentSwimLane);
            }

            task.swimlanes.slice(1).forEach((swimLane, index) => {
                let childSwimLane: Swimlane;
                if (!info[index + 1] || !info[index + 1].static) {
                    childSwimLane = parentSwimLane.children.find(s => s.value === swimLane || '');
                }

                const shouldAddTask = index === task.swimlanes.length - 2;
                if (childSwimLane) {
                    if (shouldAddTask) {
                        childSwimLane.tasks.push(task);
                    }
                } else {
                    childSwimLane = {value: swimLane || '', children: [], tasks: shouldAddTask ? [task] : []};
                    parentSwimLane.children.push(childSwimLane);
                }

                parentSwimLane = childSwimLane;
                currentMaxLevel++;
            });
            maxLevel = Math.max(maxLevel, currentMaxLevel);
        } else {
            otherTasks.push(task);
        }
        return arr;
    }, []);
    return {otherTasks, lines, maxLevel};
}

export function getOrCreateWrapperElements(wrapper: GanttWrapper): { svgElement: SVGElement, wrapperElement: HTMLElement } {
    let svgElement: SVGElement, wrapperElement: HTMLElement;

    let element;
    if (typeof wrapper === 'string') { // CSS Selector is passed
        element = document.querySelector(wrapper);
    } else {
        element = wrapper;
    }

    // get the SVGElement
    if (element instanceof HTMLElement) {
        wrapperElement = element;
        svgElement = element.querySelector('svg');
    } else if (element instanceof SVGElement) {
        svgElement = element;
    } else {
        throw new TypeError(
            'Frappé Gantt only supports usage of a string CSS selector,' +
            " HTML DOM element or SVG DOM element for the 'element' parameter"
        );
    }

    return {svgElement, wrapperElement};
}

export function getAllDependencies(task: GanttTask, map: Record<string, GanttTask>, parent?: boolean): string[] {
    const dependencies = [...parent ? (task.parentDependencies || []) : (task.dependencies || [])];
    let newDependencies = dependencies;
    for (let i = 0; i < Object.keys(map).length; i++) {
        newDependencies = newDependencies.reduce((all, dep) => {
            all.push(...(parent ? (map[dep].parentDependencies || []) : (map[dep].dependencies || [])));
            return all;
        }, []);
        dependencies.push(...newDependencies);

        if (newDependencies.length === 0) {
            break;
        }
    }

    return uniqueValues(dependencies);
}

export function computeNearestTickPosition(settings: GanttSettings, x: number): { date: Date, x: number } {
    const ticks = settings.taskTicks || [];
    let leftIx = 0;
    let rightIx = ticks.length - 1;

    while (rightIx - leftIx > 1) {
        const middleIx = Math.floor((rightIx - leftIx) / 2) + leftIx;
        if (ticks[middleIx].x < x) {
            leftIx = middleIx;
        } else {
            rightIx = middleIx;
        }
    }

    if (Math.abs(ticks[leftIx].x - x) < Math.abs(ticks[rightIx].x - x)) {
        return ticks[leftIx];
    }

    return ticks[rightIx];
}

export function tasksChanged(t1: GanttTask[], t2: Task[]): boolean {
    if ((t1 || []).length !== (t2 || []).length) {
        return true;
    }
    if ((t1 || []).length === 0) {
        return false;
    }

    return (t1 || []).some((task, index) => taskChanged(task, t2[index]));
}

function taskChanged(gt1: GanttTask, t2: Task): boolean {
    const t1 = cleanGanttTask(gt1);
    return taskProperties.some(property => {
        const isDateProperty = ['start', 'end'].includes(property);
        const t1Value = isDateProperty ? parseDate(t1[property]) : t1[property];
        const t2Value = isDateProperty ? parseDate(t2[property]) : t2[property];
        if (!t1Value && !t2Value) {
            return false;
        }

        if (isDateProperty) {
            return t1Value.getTime() !== t2Value.getTime();
        }

        if (isArray(t1Value) || isArray(t2Value)) {
            return !arrayContainsSameItems(t1Value, t2Value);
        }

        return t1Value !== t2Value;
    })
}

export function cleanGanttTask(task: GanttTask): Task {
    const id = task.taskId;
    const dependencies = uniqueValues((task.dependencies || []).map(dep => dep.split('_')[0]));
    const allowedDependencies = uniqueValues((task.allowedDependencies || []).map(dep => dep.split('_')[0]));

    return {
        id,
        name: task.name,
        progress: task.progress,
        start: task.start,
        end: task.end,
        swimlanes: task.swimlanes,
        editable: task.editable,
        startDrag: task.startDrag,
        endDrag: task.endDrag,
        textColor: task.textColor,
        barColor: task.barColor,
        progressColor: task.progressColor,
        dependencies, allowedDependencies,
        metadata: task.metadata
    };
}


