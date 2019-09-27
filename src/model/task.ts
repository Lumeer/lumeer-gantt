export interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    swimlanes: string[];
    dependencies: string[];
    allowedDependencies: string[];
    barColor?: string,
    progressColor?: string;
    textColor?: string;

    startDrag: boolean;
    endDrag: boolean;
    editable: boolean;
}

export const taskProperties = ['id', 'name', 'start', 'end', 'progress', 'swimlanes',
    'dependencies', 'allowedDependencies', 'barColor', 'progressColor', 'textColor', 'startDrag', 'endDrag', 'editable'];

export interface GanttTask extends Task {
    taskId: string;
    startDate: Date;
    endDate: Date;

    parentDependencies: string[];
    transitiveDependencies: string[];
    parentTransitiveDependencies: string[];
}
