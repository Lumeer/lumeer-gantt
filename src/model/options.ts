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

export interface GanttOptions {
    headerHeight?: number,
    headerFontSize?: number;
    columnWidth?: number,
    viewModes?: GanttMode[],
    viewMode?: GanttMode,
    fontSize?: number;
    swimlaneFontSize?: number;
    barHeight?: number,
    barCornerRadius?: number,
    arrowCurve?: number,
    padding?: number,
    dateFormat?: string,
    language?: string
    maxInitialSwimlaneWidth?: number;
    initialScroll?: number;

    avatarSize?: number;
    avatarPadding?: number;
    textBackgroundPadding?: number;
    checkboxSize?: number;

    swimlaneInfo?: GanttSwimlaneInfo[];

    lockResize?: boolean;
    createTasks?: boolean;
    resizeSwimlanes?: boolean;
    resizeTaskLeft?: boolean;
    resizeMilestones?: boolean;
    resizeTaskRight?: boolean;
    resizeProgress?: boolean;
    dragTaskSwimlanes?: boolean;
}

export interface GanttSwimlaneInfo {
    width?: number;
    title: string;
    background?: string;
    color?: string;
    static?: boolean;
}

export enum GanttMode {
    Hour = 'Hour',
    QuarterDay = 'Quarter Day',
    HalfDay = 'Half Day',
    Day = 'Day',
    Week = 'Week',
    Month = 'Month',
    Year = 'Year'
}

export const defaultOptions: GanttOptions = {
    headerHeight: 50,
    columnWidth: 30,
    viewModes: [
        GanttMode.Hour,
        GanttMode.QuarterDay,
        GanttMode.HalfDay,
        GanttMode.Day,
        GanttMode.Week,
        GanttMode.Month,
        GanttMode.Year,
    ],
    barHeight: 20,
    barCornerRadius: 3,
    arrowCurve: 5,
    padding: 20,
    viewMode: GanttMode.Day,
    dateFormat: 'YYYY-MM-DD HH',
    language: 'en',
    maxInitialSwimlaneWidth: 200,

    avatarPadding: 5,
    avatarSize: 24,
    checkboxSize: 16,
    textBackgroundPadding: 8,

    lockResize: true,
    createTasks: true,
    resizeSwimlanes: true,
    resizeTaskLeft: true,
    resizeTaskRight: true,
    resizeProgress: true,
    dragTaskSwimlanes: true
};
