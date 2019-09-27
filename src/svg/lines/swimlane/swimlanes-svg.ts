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

import {createSVG, hideElement, setAttributes, showElement} from '../../../utils/svg.utils';
import {getSettingsTableHeight} from '../../../utils/gantt.utils';
import {GanttLine, GanttSwimlane} from '../../../model/gantt';
import {SwimlaneColumnSvg} from './swimlane-column-svg';
import {GanttSvg} from '../../gantt-svg';
import {copyArray} from '../../../utils/common.utils';

export class SwimlanesSvg {

    public readonly containsSwimLanes: boolean;

    private swimlaneWidths: number[];
    private swimlaneWidthsDrag: number[];

    private swimlaneWidth: number;
    private swimlaneWidthDrag: number;

    private swimlaneHeight: number;
    private swimlaneHeightDrag: number;

    private swimlaneHeaderElement: SVGElement;
    private swimlaneBackgroundElement: SVGElement;
    private columnsSvgs: SwimlaneColumnSvg[] = [];

    constructor(private gantt: GanttSvg) {
        this.swimlaneWidths = this.computeSwimLaneWidths();
        this.swimlaneWidth = this.swimlaneWidths.reduce((s, w) => s + w, 0);
        this.containsSwimLanes = this.swimlaneWidths.length > 0;
    }

    private computeSwimLaneWidths(): number[] {
        const longestTitles = (this.gantt.lines || []).reduce<string[]>((arr, line) => {
            line.swimlanes.forEach((sl, index) => {
                if (sl && (!arr[index] || arr[index].length < sl.value.length)) {
                    arr[index] = sl.value;
                }
            });
            return arr;
        }, []);

        if (longestTitles.length === 0) {
            return [];
        }

        (this.gantt.options.swimlaneInfo || []).forEach((header, index) => {
            const title = header && header.title;
            if (title && (!longestTitles[index] || longestTitles[index].length < title.length)) {
                longestTitles[index] = title;
            }
        });

        const helperSvg = createSVG('g', {}, this.gantt.layers.swimlanes);
        const helperTextSvg = createSVG('text', {
            x: 0,
            y: 0,
            class: 'swimlane-label',
        }, helperSvg);

        const widths = longestTitles.reduce((arr, title, index) => {
            const header = (this.gantt.options.swimlaneInfo || [])[index];
            if (header && header.width) {
                arr[index] = header.width;
            } else {
                helperTextSvg.innerHTML = title;
                arr[index] = helperTextSvg.getBoundingClientRect().width + 2 * this.gantt.options.padding;
            }
            return arr;
        }, []);

        helperSvg.remove();

        return widths;
    }

    public render() {
        if (this.containsSwimLanes) {
            this.showSwimLanes();
        } else {
            this.hideSwimLanes();
        }
    }

    private showSwimLanes() {
        showElement(this.gantt.layers.swimlanes);
        this.renderSwimLaneWrappers();
        this.renderColumns();
        this.renderHeaders();
        this.updateWrapperSize();
    }

    private renderSwimLaneWrappers() {
        this.swimlaneHeaderElement = createSVG('rect', {
            x: 0,
            y: 0,
            width: this.swimlaneWidth,
            height: this.gantt.settings.headerHeight,
            class: 'swimlanes-header',
        }, this.gantt.layers.swimlanes);

        this.swimlaneBackgroundElement = createSVG('rect', {
            x: 0,
            y: this.gantt.settings.headerHeight,
            width: this.swimlaneWidth,
            height: getSettingsTableHeight(this.gantt.settings) - this.gantt.settings.headerHeight,
            class: 'swimlanes-background',
        }, this.gantt.layers.swimlanes);
    }

    private hideSwimLanes() {
        hideElement(this.gantt.layers.swimlanes);
    }

    private renderColumns() {
        this.columnsSvgs = [];

        let y = this.gantt.settings.headerHeight;
        let previousLines: GanttSwimlane[] = [];
        this.swimlaneHeight = 0;

        (this.gantt.lines || []).forEach((line, index) => {
            const height = this.gantt.settings.rowHeights[index];
            this.swimlaneHeight += height;
            this.renderSwimLane(line, index, y, height, previousLines);
            previousLines = line.swimlanes || [];
            y += height;
        });
    }

    private renderSwimLane(line: GanttLine, index: number, y: number, height: number, previousLines: GanttSwimlane[]) {
        let x = 0;
        for (let i = 0; i < (line.swimlanes || []).length; i++) {
            const width = this.swimlaneWidths[i];
            const swimlane = line.swimlanes[i];

            if (!this.columnsSvgs[i]) {
                this.columnsSvgs[i] = new SwimlaneColumnSvg(this.gantt, this, width, x);
            }
            const className = isEmptyLine(line.swimlanes) ? 'empty' : null;
            const isSameSwimLane = previousLines[i] && swimlane && previousLines[i].id === swimlane.id;
            this.columnsSvgs[i].renderCell(swimlane, index, height, y, isSameSwimLane, className);

            x += width;
        }
    }

    private renderHeaders() {
        const headerHeight = Math.min(this.gantt.settings.defaultRowHeight, this.gantt.settings.headerHeight);
        const y = this.gantt.settings.headerHeight - headerHeight;

        const length = Math.min((this.gantt.options.swimlaneInfo || []).length, (this.columnsSvgs || []).length);
        for (let i = 0; i < length; i++) {
            const header = this.gantt.options.swimlaneInfo[i];
            this.columnsSvgs[i].renderHeaderCell(header, y, headerHeight);
        }

        const handleHeight = getSettingsTableHeight(this.gantt.settings) - this.gantt.settings.headerHeight
            - (this.swimlaneContainsEmptyLine() ? this.gantt.settings.defaultRowHeight : 0);

        for (let i = 0; i < length; i++) {
            const header = this.gantt.options.swimlaneInfo[i];
            const nextHeader = this.gantt.options.swimlaneInfo[i + 1];

            const startFromHeader = !!(header || nextHeader);
            const handleY = this.gantt.settings.headerHeight - (startFromHeader ? headerHeight : 0);
            const height = handleHeight + (startFromHeader ? headerHeight : 0);
            this.columnsSvgs[i].renderResizeHandle(startFromHeader, height, handleY);
        }
    }

    private swimlaneContainsEmptyLine(): boolean {
        const lastLine = this.gantt.lines[this.gantt.lines.length - 1];
        return lastLine && isEmptyLine(lastLine.swimlanes || []);
    }

    public handleDragStart(element: any) {
        this.columnsSvgs.forEach(svg => svg.handleDragStart(element));

        this.swimlaneWidthsDrag = copyArray<number>(this.swimlaneWidths);
        this.swimlaneWidthDrag = this.swimlaneWidth;
        this.swimlaneHeightDrag = this.swimlaneHeight;
    }

    public handleDrag(element: any, dx: number, dy: number, x: number, y: number) {
        this.columnsSvgs.forEach(svg => svg.handleDrag(element, dx, dy, x, y));
    }

    public handleDragEnd(element: any) {
        this.checkWidthResized();

        this.columnsSvgs.forEach(svg => svg.handleDragEnd(element));

        this.swimlaneWidthsDrag = null;
        this.swimlaneWidthDrag = null;
        this.swimlaneHeightDrag = null;
    }

    private checkWidthResized() {
        if (this.swimlaneWidthsDrag) {
            const changedIndex = (this.swimlaneWidths || []).findIndex((width, index) => this.swimlaneWidthsDrag[index] !== width);
            if (changedIndex !== -1) {
                this.gantt.onSwimlaneResized(changedIndex, this.swimlaneWidths[changedIndex]);
            }
        }
    }

    public onKeyUp(event: KeyboardEvent) {
        this.columnsSvgs.forEach(svg => svg.onKeyUp(event));
        if (event.key === 'Escape') {
            this.onEscapeKeyUp();
        }
    }

    private onEscapeKeyUp() {
        if (this.swimlaneWidthDrag) {
            if (this.swimlaneWidth !== this.swimlaneWidthDrag) {
                this.swimlaneWidth = this.swimlaneWidthDrag;
                this.swimlaneWidthDrag = null;
                this.updateWrapperPositions();
            }
        }
        if (this.swimlaneHeightDrag) {
            if (this.swimlaneHeight !== this.swimlaneHeightDrag) {
                this.swimlaneHeight = this.swimlaneHeightDrag;
                this.swimlaneHeightDrag = null;
                this.updateWrapperSize();
            }
        }
        if (this.swimlaneWidthsDrag) {
            this.swimlaneWidths = copyArray<number>(this.swimlaneWidthsDrag);
            this.swimlaneWidthsDrag = null;
        }
    }

    public swimlaneResizing(columnSvg: SwimlaneColumnSvg, diff: number) {
        const index = this.columnsSvgs.findIndex(svg => svg === columnSvg);
        if (index !== -1) {
            this.swimlaneWidth += diff;
            this.swimlaneWidths[index] += diff;
            this.columnsSvgs.slice(index + 1).forEach(svg => svg.moveXPosition(diff));
            this.updateWrapperPositions();
        }
    }

    private updateWrapperPositions() {
        setAttributes(this.swimlaneBackgroundElement, {width: this.swimlaneWidth});
        setAttributes(this.swimlaneHeaderElement, {width: this.swimlaneWidth});
        setAttributes(this.gantt.layers.swimlanes, {width: this.swimlaneWidth});
    }

    private updateWrapperSize() {
        setAttributes(this.gantt.layers.swimlanes, {
            height: this.swimlaneHeight + this.gantt.settings.headerHeight,
            width: this.swimlaneWidth
        });
        setAttributes(this.swimlaneBackgroundElement, {height: this.swimlaneHeight});
    }

    public lineResized(index: number, diff: number) {
        this.swimlaneHeight += diff;
        this.updateWrapperSize();
        this.columnsSvgs.forEach(svg => svg.resizeColumn(index, diff));
    }
}

function isEmptyLine(swimlanes: GanttSwimlane[]): boolean {
    return swimlanes.every(sw => !sw || !sw.value);
}
