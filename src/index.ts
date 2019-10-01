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

import './styles/gantt.scss';
import {Task} from './model/task';
import {GanttMode, GanttOptions} from './model/options';
import {GanttWrapper} from './model/gantt';
import {GanttSvg} from './svg/gantt-svg';

export default class Gantt {

    private ganttSvg: GanttSvg;

    public onSwimlaneResized?: (index: number, width: number) => void;
    public onTaskChanged?: (task: Task) => void;
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
