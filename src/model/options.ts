export interface GanttOptions {
    headerHeight?: number,
    columnWidth?: number,
    viewModes?: GanttMode[],
    viewMode?: GanttMode,
    barHeight?: number,
    barCornerRadius?: number,
    arrowCurve?: number,
    padding?: number,
    dateFormat?: string,
    language?: string
    swimlaneInfo?: GanttSwimlaneInfo[];

    lockResize?: boolean;
    createTasks?: boolean;
    resizeSwimLanes?: boolean;
    resizeTaskLeft?: boolean;
    resizeTaskRight?: boolean;
    resizeTaskSwimlanes?: boolean;
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

    lockResize: true,
    createTasks: true,
    resizeSwimLanes: true,
    resizeTaskLeft: true,
    resizeTaskRight: true,
    resizeTaskSwimlanes: true,
    resizeProgress: true,
    dragTaskSwimlanes: true,
};
