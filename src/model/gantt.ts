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

import {GanttTask} from './task';

export type GanttWrapper = HTMLElement | string | SVGElement;

export interface GanttLayers {
    swimlanes?: SVGElement;
    grid?: SVGElement;
    date?: SVGElement;
    bar?: SVGElement;
    arrow?: SVGElement;
    handle?: SVGElement;
}

export interface GanttSettings {
    minDate?: Date;
    maxDate?: Date;
    dates?: Date[];

    taskTicks?: {
        date: Date;
        x: number;
    }[];

    hoursStep?: number;
    headerHeight?: number;
    numberRows?: number;
    defaultRowHeight?: number;
    rowHeights?: number[];
    rowWidth?: number;
    tableWidth?: number;
}

export interface GanttLine {
    swimlanes: GanttSwimlane[];
    tasks: GanttTask[];
}

export interface GanttSwimlane {
    id: string;
    value: any;
    title: string;
    data?: any;
    background?: string;
    color?: string;
    avatarUrl?: string;
}
