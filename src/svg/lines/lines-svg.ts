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

import {GanttTask} from '../../model/task';
import {BarsSvg} from './bar/bars-svg';
import {SwimlanesSvg} from './swimlane/swimlanes-svg';
import {ArrowSvg} from './bar/arrow-svg';
import {BarSvg} from './bar/bar-svg';
import {GanttSvg} from '../gantt-svg';
import {isNotNullOrUndefined, uniqueValues} from '../../utils/common.utils';
import {cleanGanttTask, refreshTasksTransitiveDependencies} from '../../utils/gantt.utils';
import {GanttSwimlane} from '../../model/gantt';

export class LinesSvg {

    private swimLanesSvg: SwimlanesSvg;
    private barsSvgs: BarsSvg[] = [];
    public barSvgsMap: Record<string, BarSvg> = {};

    public get containsSwimLanes(): boolean {
        return isNotNullOrUndefined(this.swimLanesSvg) ? this.swimLanesSvg.containsSwimLanes : false;
    }

    constructor(private gantt: GanttSvg) {
    }

    public render() {
        this.renderTaskLines();
        this.renderArrows();
        this.renderSwimLanes();
    }

    private renderTaskLines() {
        this.barsSvgs = [];
        this.barSvgsMap = {};

        let y = this.gantt.settings.headerHeight;

        (this.gantt.lines || []).forEach((line, index) => {
            const barsSvg = this.renderTasksLines(line.tasks, y, line.swimlanes);
            this.barsSvgs[index] = barsSvg;
            barsSvg.barSvgs.forEach(bar => (this.barSvgsMap[bar.id] = bar));
            y += barsSvg.height;
            this.gantt.settings.rowHeights[index] = barsSvg.height;
        });
    }

    private renderTasksLines(tasks: GanttTask[], y: number, swimlanes: GanttSwimlane[]): BarsSvg {
        const barsSvg = new BarsSvg(tasks, y, this.gantt, swimlanes);
        barsSvg.render();
        return barsSvg;
    }

    private renderArrows() {
        Object.values(this.barSvgsMap || {}).forEach(barSvg => {
            const dependenciesBars = (barSvg.task.dependencies || []).map(id => this.barSvgsMap[id])
                .filter(bar => !!bar);
            if (dependenciesBars.length) {
                const arrows = dependenciesBars.map(dependencyBar => {
                    const arrow = new ArrowSvg(this.gantt, barSvg, dependencyBar);
                    arrow.render();
                    dependencyBar.addToArrow(arrow);
                    return arrow;
                });
                barSvg.setFromArrows(arrows);
            }
        });
    }

    private renderSwimLanes() {
        this.swimLanesSvg = new SwimlanesSvg(this.gantt);
        this.swimLanesSvg.render();
    }

    public handleDragStart(element: any) {
        this.barsSvgs.forEach(svg => svg.handleDragStart(element));
        this.swimLanesSvg.handleDragStart(element);
    }

    public handleDrag(element: any, dx: number, dy: number, x: number, y: number) {
        this.barsSvgs.forEach(svg => svg.handleDrag(element, dx, dy, x, y));
        this.swimLanesSvg.handleDrag(element, dx, dy, x, y);
    }

    public handleDragEnd(element: any) {
        this.checkTasksChanged();
        this.barsSvgs.forEach(svg => svg.handleDragEnd(element));
        this.swimLanesSvg.handleDragEnd(element);
    }

    public onBarDragging(bar: BarSvg, dx1: number, dx2: number) {
        const sameTaskIds = (this.gantt.taskIdsMap[bar.task.taskId] || []).filter(id => id !== bar.task.id);
        const movedTaskIds = [...sameTaskIds];
        if (this.gantt.options.lockResize && bar.task.transitiveDependencies.length) {
            this.barsSvgs.forEach(bar => bar.dragBars(sameTaskIds, dx1, dx2));

            const dependenciesIds = [...bar.task.transitiveDependencies].filter(id => !sameTaskIds.includes(id));
            movedTaskIds.push(...dependenciesIds);
            const dependencyDx1 = dx1;
            const dependencyDx2 = dx1 === 0 ? 0 : dx2 === 0 ? dx1 : dx2;
            this.barsSvgs.forEach(bar => bar.dragBars(dependenciesIds, dependencyDx1, dependencyDx2));
        } else {
            this.barsSvgs.forEach(bar => bar.dragBars(sameTaskIds, dx1, dx2));
        }

        this.checkAfterBarDragging(bar, movedTaskIds);
    }

    private checkAfterBarDragging(bar: BarSvg, movedTaskIds: string[]) {
        this.barsSvgs.forEach(barsSvg => {
            if (bar.parent !== barsSvg) {
                const bars = barsSvg.barSvgs.filter(bar => movedTaskIds.includes(bar.id));
                if (bars.length) {
                    barsSvg.onBarDragging(bars[0], false);
                }
            }
        })
    }

    public onBarProgressDragging(bar: BarSvg, diff: number) {
        const sameTaskIds = (this.gantt.taskIdsMap[bar.task.taskId] || []).filter(id => id !== bar.task.id);
        Object.values(this.barSvgsMap || {})
            .filter(bar => sameTaskIds.includes(bar.id))
            .forEach(bar => bar.dragProgress(diff));

        this.checkAfterBarDragging(bar, sameTaskIds);
    }

    public onKeyUp(event: KeyboardEvent) {
        this.barsSvgs.forEach(bar => bar.onKeyUp(event));
        this.swimLanesSvg.onKeyUp(event);
    }

    public onDoubleClick(element: any){
        this.barsSvgs.forEach(bar => bar.onDoubleClick(element));
    }

    public onLineResized(barsSvg: BarsSvg, diff: number) {
        const index = this.barsSvgs.indexOf(barsSvg);
        if (index !== -1) {
            this.gantt.settings.rowHeights[index] = barsSvg.height;
            this.gantt.onLineResized(index, diff);
            this.barsSvgs.slice(index + 1).forEach(svg => svg.moveYPosition(diff));
            this.swimLanesSvg.lineResized(index, diff);
        }
    }

    public getSameLockedBars(bar: BarSvg): BarSvg[] {
        const bars = Object.values(this.barSvgsMap || {}).filter(b => b.task.taskId === bar.task.taskId);
        if (bars.length) {
            return bars;
        }
        return [bar];
    }

    public createArrows(fromBars: BarSvg[], toBars: BarSvg[]) {
        fromBars.forEach(fromBar => {
            const arrows = toBars.map(toBar => {
                const arrow = new ArrowSvg(this.gantt, fromBar, toBar);
                arrow.render();
                toBar.task.parentDependencies.push(fromBar.task.id);
                toBar.addToArrow(arrow);
                return arrow;
            });
            fromBar.task.dependencies.push(...uniqueValues(toBars.map(bar => bar.task.id)));
            fromBar.addFromArrows(arrows);
        });
        refreshTasksTransitiveDependencies(this.gantt.tasksMap);

        this.gantt.onTaskDependencyAdded(cleanGanttTask(fromBars[0].task), cleanGanttTask(toBars[0].task));
    }

    public deleteArrow(fromBar: BarSvg, toBar: BarSvg) {
        const fromBars = this.getSameLockedBars(fromBar);
        const toBars = this.getSameLockedBars(toBar);
        const toBarsIds = toBars.map(toBar => toBar.task.id);
        fromBars.forEach(fromBar => {
            fromBar.task.dependencies = fromBar.task.dependencies.filter(id => !toBarsIds.includes(id));
            toBars.forEach(toBar => {
                fromBar.removeFromArrow(toBar);
                toBar.task.parentDependencies = toBar.task.parentDependencies.filter(id => id !== fromBar.task.id);
                toBar.removeToArrow(fromBar);
            });
        });
        refreshTasksTransitiveDependencies(this.gantt.tasksMap);

        this.gantt.onTaskDependencyRemoved(cleanGanttTask(fromBar.task), cleanGanttTask(toBar.task));
    }

    public setArrowActive(fromBar: BarSvg, toBar: BarSvg, active: boolean) {
        const fromBars = this.getSameLockedBars(fromBar);
        const toBars = this.getSameLockedBars(toBar);

        fromBars.forEach(fromBar => {
            toBars.forEach(toBar => {
                fromBar.setArrowActive(toBar, active);
            })
        });
    }

    public findBarsSvgByY(y: number): BarsSvg {
        return (this.barsSvgs || []).find(bars => bars.getY <= y && bars.getY + bars.height >= y);
    }

    public handleVerticalDragBar(bar: BarSvg, dy: number, y: number): boolean {
        let newParent = this.barsSvgs.find((barsSvg, index) => (index === 0 && y <= barsSvg.getY)
            || (index === this.barsSvgs.length - 1 && y >= barsSvg.getY + barsSvg.height)
            || ((barsSvg.getY <= y) && (barsSvg.getY + barsSvg.height >= y)));

        const previousY = bar.getY;
        let parentChanged = false;
        let newY = newParent.getNewBarYPosition(y);

        if (newParent === bar.parent) {
            newParent.updateBarSvgLine(bar, newY);
        } else {
            if (dy < 0 && newParent.someBarOverflows(bar, newY)) {
                newY = newParent.getNextLineY(newY);
            }
            bar.parent.removeBarSvg(bar);
            newParent.addBarSvg(bar, newY);
            parentChanged = true;
        }

        if (parentChanged || previousY !== newY) {
            bar.setYPositionWithParent(newParent, newY);
            return true;
        }

        return false;
    }

    private checkTasksChanged() {
        const emittedTaskIds = [];
        for (const bar of Object.values(this.barSvgsMap || [])) {
            if (emittedTaskIds.includes(bar.task.taskId)) {
                continue;
            }

            if (bar.parentChanged()) {
                this.gantt.onTaskSwimlanesChanged(cleanGanttTask(bar.task));
                emittedTaskIds.push(bar.task.taskId);
            } else if (bar.progressChanged()) {
                this.gantt.onTaskProgressChanged(cleanGanttTask(bar.task));
                emittedTaskIds.push(bar.task.taskId);
            } else if (bar.datesChanged()) {
                this.gantt.onTaskDatesChanged(cleanGanttTask(bar.task));
                emittedTaskIds.push(bar.task.taskId);
            }
        }
    }
}
