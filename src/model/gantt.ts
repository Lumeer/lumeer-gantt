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
    value: string;
}
