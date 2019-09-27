import './styles/gantt.scss';
import {Task} from './model/task';
import {GanttMode, GanttOptions} from './model/options';
import {GanttWrapper} from './model/gantt';
import {GanttSvg} from './svg/gantt-svg';

export default class Gantt {

    private ganttSvg: GanttSvg;

    public onSwimlaneResized?: (index: number, width: number) => void;
    public onTaskDatesChanged?: (task: Task) => void;
    public onTaskProgressChanged?: (task: Task) => void;
    public onTaskSwimlanesChanged?: (task: Task) => void;
    public onTaskDependencyAdded?: (fromTask: Task, toTask: Task) => void;
    public onTaskDependencyRemoved?: (fromTask: Task, toTask: Task) => void;
    public onTaskCreated?: (task: Task) => void;
    public onTaskDetail?: (task: Task) => void;

    constructor(wrapper: GanttWrapper, tasks: Task[], options: GanttOptions) {
        this.ganttSvg = new GanttSvg(wrapper, tasks, options, this);
    }

    public scrollToToday() {
        this.ganttSvg.scrollToToday();
    }

    public changeViewMode(mode: GanttMode) {
        this.ganttSvg.changeViewMode(mode);
    }

    public changeTasks(tasks: Task[], options?: GanttOptions) {
        this.ganttSvg.changeTasks(tasks, options);
    }

    public changeOptions(options: GanttOptions) {
        this.ganttSvg.changeOptions(options);
    }

}
