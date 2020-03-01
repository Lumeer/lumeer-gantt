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

import {GanttTask, Swimlane} from '../../../model/task';
import {BarSvg} from './bar-svg';
import {copyMatrix} from '../../../utils/common.utils';
import {GanttSvg} from '../../gantt-svg';
import {GanttSwimlane} from '../../../model/gantt';
import {cleanGanttTask} from '../../../utils/gantt.utils';

export class BarsSvg {

    private barLinesSvgs: BarSvg[][] = [];
    private barLinesSvgsDrag: BarSvg[][];

    private y: number;
    private yDrag: number;

    public get barSvgs(): BarSvg[] {
        return this.reduceBarSvgs(this.barLinesSvgs);
    }

    public get height(): number {
        const overflowLines = Math.max(this.barLinesSvgs.length, 1);
        return overflowLines * this.gantt.options.barHeight + (overflowLines + 1) * this.gantt.options.padding / 2;
    }

    public get getY(): number {
        return this.y;
    }

    public get swimlaneObjects(): Swimlane[] {
        return (this.swimlanes || []).map(obj => ({...obj}));
    }

    constructor(private tasks: GanttTask[],
                private yPosition: number,
                private gantt: GanttSvg,
                private swimlanes: GanttSwimlane[]) {
        this.y = yPosition;
    }

    private reduceBarSvgs(barLinesSvgs: BarSvg[][]): BarSvg[] {
        return (barLinesSvgs || []).reduce((arr, line) => {
            arr.push(...line);
            return arr;
        }, []);
    }

    public hasStaticSwimlane(): boolean {
        return this.staticSwimlaneIndex() !== -1;
    }

    public staticSwimlaneIndex(): number {
        const swimlaneInfo = this.gantt.options.swimlaneInfo || [];
        return this.swimlanes.findIndex((swimlane, index) => swimlaneInfo[index]?.static);
    }

    public render() {
        this.barLinesSvgs = [];
        for (const task of (this.tasks || [])) {
            const barSvg = new BarSvg(task, this.y, this.gantt, this);
            barSvg.render();
            this.checkBarPosition(barSvg);
        }
    }

    private checkBarPosition(barSvg: BarSvg, minLine: number = 0) {
        const overflowLine = this.taskOverflowLine(this.barLinesSvgs, barSvg.startX, barSvg.endX, minLine);
        const yPosition = this.computeYBarPositionForLine(overflowLine);

        barSvg.setYPosition(yPosition);

        if (!this.barLinesSvgs[overflowLine]) {
            this.barLinesSvgs[overflowLine] = [];
        }
        this.barLinesSvgs[overflowLine].push(barSvg);
    }

    private computeYBarPositionForLine(line: number): number {
        return this.y + line * this.gantt.options.barHeight + (line + 1) * this.gantt.options.padding / 2;
    }

    private computeLineForYBarPosition(y: number): number {
        const position = Math.round((y - this.y - this.gantt.options.padding - 2) / (this.gantt.options.barHeight + this.gantt.options.padding / 2));
        return Math.max(position, 0);
    }

    private taskOverflowLine(barLinesSvgs: BarSvg[][], startX: number, endX: number, minLine: number): number {
        if (barLinesSvgs.length === 0) {
            return minLine;
        }

        for (let i = minLine; i < barLinesSvgs.length; i++) {
            if (!this.barOverflowsWithBars(barLinesSvgs[i], startX, endX)) {
                return i;
            }
        }

        return Math.max(minLine, barLinesSvgs.length);
    }

    private barOverflowsWithBars(barSvgs: BarSvg[], startX: number, endX: number): boolean {
        for (let i = 0; i < (barSvgs || []).length; i++) {
            const bar = barSvgs[i];
            if (this.barOverflowsWithBar(startX, endX, bar.startX, bar.endX)) {
                return true;
            }
        }
        return false;
    }

    private barOverflowsWithBar(start1X: number, end1X: number, start2X: number, end2X: number): boolean {
        return (start1X >= start2X && start1X <= end2X) || (end1X >= start2X && end1X <= end2X) ||
            (start2X >= start1X && start2X <= end1X) || (end2X >= start1X && end2X <= end1X);
    }

    public handleDragStart(element: any) {
        this.barSvgs.forEach(bar => bar.handleDragStart(element));
        this.barLinesSvgsDrag = copyMatrix<BarSvg>(this.barLinesSvgs);
        this.yDrag = this.y;
    }

    public handleDrag(element: any, dx: number, dy: number, x: number, y: number) {
        this.barSvgs.forEach(bar => bar.handleDrag(element, dx, dy, x, y));
    }

    public handleDragEnd(element: any) {
        this.barSvgs.forEach(bar => bar.handleDragEnd(element));
        this.barLinesSvgsDrag = null;
        this.yDrag = null;
    }

    public dragBars(ids: string[], dx1: number, dx2: number) {
        this.barSvgs.filter(bar => ids.includes(bar.id)).forEach(bar => bar.dragBar(dx1, dx2));
    }

    public onKeyUp(event: KeyboardEvent) {
        this.barSvgs.forEach(bar => bar.onKeyUp(event));
        if (event.key === 'Escape') {
            this.onEscapeKeyUp();
        }
    }

    private onEscapeKeyUp() {
        if (this.barLinesSvgsDrag) {
            this.barLinesSvgs = copyMatrix<BarSvg>(this.barLinesSvgsDrag);
            this.barLinesSvgsDrag = null;
        }
        if (this.yDrag) {
            this.y = this.yDrag;
            this.yDrag = null;
        }
    }

    public onDoubleClick(element: any) {
        this.barSvgs.forEach(bar => bar.onDoubleClick(element));
    }

    public onBarDragging(barSvg: BarSvg, keepYPosition: boolean) {
        const currentPosition = this.barLinesSvgs.findIndex(line => (line || []).some(svg => svg.id === barSvg.id));
        const linesCopy = [...this.barLinesSvgs].map(line => [...(line || [])].filter(svg => svg.id !== barSvg.id));
        let position: number;
        if (keepYPosition) {
            position = currentPosition;
        } else {
            const computedPosition = this.taskOverflowLine(linesCopy, barSvg.startX, barSvg.endX, 0);
            position = Math.min(currentPosition, computedPosition);
        }

        const newY = this.computeYBarPositionForLine(position);
        barSvg.setYPosition(newY);

        const heightCopy = this.height;

        const barSvgs = this.reduceBarSvgs(linesCopy);
        this.barLinesSvgs = [];
        this.barLinesSvgs[position] = [barSvg];

        barSvgs.forEach(svg => this.checkBarPosition(svg));

        if (heightCopy !== this.height) {
            this.gantt.linesSvg.onLineResized(this, this.height - heightCopy);
        }
    }

    public moveYPosition(offset: number) {
        this.barSvgs.forEach(svg => svg.moveYPosition(offset));
        this.y += offset;
    }

    public onNewBarDragging(startX: number, endX: number, y: number) {
        const position = this.computeLineForYBarPosition(y);
        const heightCopy = this.height;
        const linesCopy = copyMatrix(this.barLinesSvgs);

        this.barLinesSvgs = [];

        for (let i = 0; i < linesCopy.length; i++) {
            if (i < position) {
                this.barLinesSvgs[i] = linesCopy[i];
            } else {
                (linesCopy[i] || []).forEach(bar => {
                    const overflows = this.barOverflowsWithBar(startX, endX, bar.startX, bar.endX);

                    let barPosition: number = 0;
                    if (i === position) {
                        barPosition = overflows ? i + 1 : i;
                    } else {
                        const line = this.taskOverflowLine(this.barLinesSvgs, bar.startX, bar.endX, position);
                        if (line === position && !overflows) {
                            barPosition = position;
                        } else if (line !== position) {
                            barPosition = line;
                        } else {
                            barPosition = this.taskOverflowLine(this.barLinesSvgs, bar.startX, bar.endX, i);
                        }
                    }

                    const yPosition = this.computeYBarPositionForLine(barPosition);

                    bar.setYPosition(yPosition);

                    if (!this.barLinesSvgs[barPosition]) {
                        this.barLinesSvgs[barPosition] = [];
                    }
                    this.barLinesSvgs[barPosition].push(bar);
                });
            }
        }

        if (heightCopy !== this.height) {
            this.gantt.linesSvg.onLineResized(this, this.height - heightCopy);
        }
    }

    public getNewBarYPosition(y: number): number {
        for (let i = 0; i < (this.barLinesSvgs || []).length; i++) {
            const linePosition = i === 0 ? this.y : this.computeYBarPositionForLine(i) - this.gantt.options.padding / 4;
            const nextLinePosition = i === this.barLinesSvgs.length - 1 ? this.y + this.height
                : this.computeYBarPositionForLine(i + 1) - this.gantt.options.padding / 4;
            if (y >= linePosition && y <= nextLinePosition) {
                return this.computeYBarPositionForLine(i);
            }
        }

        return this.computeYBarPositionForLine(0);
    }

    public someBarOverflows(bar: BarSvg, y: number): boolean {
        return this.barSvgs.some(otherBar => bar.id !== otherBar.id
            && otherBar.getY === y
            && this.barOverflowsWithBar(bar.startX, bar.endX, otherBar.startX, otherBar.endX));
    }

    public getNextLineY(y: number): number {
        const line = this.computeLineForYBarPosition(y);
        return this.computeYBarPositionForLine(line + 1);
    }

    public createBarSvg(task: GanttTask, barY: number) {
        task.swimlanes = this.swimlaneObjects;

        const barSvg = new BarSvg(task, barY - this.gantt.options.padding / 2, this.gantt, this);
        barSvg.render();
        this.addBarSvg(barSvg, barY);
        this.gantt.linesSvg.barSvgsMap[task.id] = barSvg;

        this.gantt.onTaskCreated(cleanGanttTask(task, task.id));
    }

    public addBarSvg(barSvg: BarSvg, barY: number) {
        const line = this.computeLineForYBarPosition(barY);
        const heightCopy = this.height;
        if (this.barLinesSvgs[line]) {
            this.barLinesSvgs[line].push(barSvg);
        } else {
            this.barLinesSvgs[line] = [barSvg]
        }
        if (heightCopy !== this.height) {
            this.gantt.linesSvg.onLineResized(this, this.height - heightCopy);
        }
    }

    public removeBarSvg(barSvg: BarSvg, checkHeight = true) {
        const heightCopy = this.height;
        for (let i = 0; i < this.barLinesSvgs.length; i++) {
            if (this.barLinesSvgs[i]) {
                this.barLinesSvgs[i] = this.barLinesSvgs[i].filter(svg => svg.id !== barSvg.id);
            }
        }
        if (checkHeight) {
            const bars = [...this.barSvgs];
            this.barLinesSvgs = [];
            bars.forEach(bar => this.checkBarPosition(bar));

            if (checkHeight && heightCopy !== this.height) {
                this.gantt.linesSvg.onLineResized(this, this.height - heightCopy);
            }

        }
    }

    public updateBarSvgLine(barSvg: BarSvg, barY: number) {
        this.removeBarSvg(barSvg, false);
        this.addBarSvg(barSvg, barY);
    }

}
