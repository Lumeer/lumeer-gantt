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

import {addToAttribute, createSVG, setAttributes} from '../../../utils/svg.utils';
import {generateId} from '../../../utils/gantt.utils';
import {GanttSwimlane} from '../../../model/gantt';
import {GanttSwimlaneInfo} from '../../../model/options';
import {SwimlanesSvg} from './swimlanes-svg';
import {copyArray} from '../../../utils/common.utils';
import {GanttSvg} from '../../gantt-svg';

const minSwimLaneWidth = 5;
const handleWidth = 10;

const swimlaneResizeHandleClass = 'swimlane-resize-handle';

export class SwimlaneColumnSvg {

    private rectElements: SVGElement[] = [];
    private textElements: SVGElement[] = [];

    private headerRectElement: SVGElement;
    private headerTextElement: SVGElement;
    private headerY: number;
    private headerHeight: number;

    private handleElement: SVGElement;
    private handleHeight: number;
    private handleHeightDrag: number;

    private width: number;
    private widthDrag: number;
    private x: number;
    private xDrag: number;

    private heights: number[] = [];
    private heightsDrag: number[];
    private ys: number[] = [];
    private ysDrag: number[];

    constructor(private gantt: GanttSvg, private swimlanesSvg: SwimlanesSvg, width: number, x: number) {
        this.width = width;
        this.x = x;
    }

    private get handleX(): number {
        return this.x + this.width - handleWidth / 2;
    }

    public renderCell(swimLane: GanttSwimlane, index: number, height: number, y: number, isSameSwimlane: boolean, className?: string) {
        if (isSameSwimlane) {
            this.rectElements[index] = this.rectElements[index - 1];
            this.textElements[index] = this.textElements[index - 1];

            if (this.rectElements[index]) {
                addToAttribute(this.rectElements[index], 'height', height);
            }

            if (this.textElements[index]) {
                addToAttribute(this.textElements[index], 'y', height / 2);
            }
        } else {

            const swimLaneGroup = createSVG('g', {
                id: swimLane && swimLane.id || generateId(),
                class: 'swimlane',
            }, this.gantt.layers.swimlanes);

            this.rectElements[index] = createSVG('rect', {
                x: this.x, y, width: this.width,
                height,
                class: `swimlane-rect ${className || ''}`,
            }, swimLaneGroup);

            if (swimLane && swimLane.value) {
                this.textElements[index] = createSVG('text', {
                    x: this.x + this.gantt.options.padding,
                    y: y + height / 2,
                    'dominant-baseline': 'middle',
                    'text-anchor': 'start',
                    class: 'swimlane-label',
                }, swimLaneGroup, swimLane.value);
            }
        }

        this.heights[index] = height;
        this.ys[index] = y;
    }

    public renderHeaderCell(header: GanttSwimlaneInfo, y: number, height: number) {
        const swimLaneGroup = createSVG('g', {
            class: 'swimlane-header',
        }, this.gantt.layers.swimlanes);

        this.headerRectElement = createSVG('rect', {
            x: this.x, y, width: this.width, height,
            style: header && header.background ? `fill: ${header.background};` : '',
            class: 'swimlane-header-rect' + (!header ? ' empty' : ''),
        }, swimLaneGroup);

        if (header) {
            this.headerTextElement = createSVG('text', {
                x: this.x + this.gantt.options.padding,
                y: y + height / 2,
                'dominant-baseline': 'middle',
                'text-anchor': 'start',
                style: header.color ? `fill: ${header.color};` : '',
                class: 'swimlane-header-label',
            }, swimLaneGroup, header.title);
        }

        this.headerY = y;
        this.headerHeight = height;
    }

    public renderResizeHandle(startFromHeader: boolean, height: number, y: number) {
        if (this.gantt.options.resizeSwimLanes) {
            this.handleElement = createSVG('rect', {
                x: this.handleX, y, width: handleWidth, height,
                class: swimlaneResizeHandleClass,
            }, this.gantt.layers.swimlanes);

            this.handleHeight = height;
        }
    }

    public handleDragStart(element: any) {
        this.widthDrag = this.width;
        this.xDrag = this.x;
        this.handleHeightDrag = this.handleHeight;
        this.heightsDrag = copyArray(this.heights);
        this.ysDrag = copyArray(this.ys);
    }

    public handleDrag(element: any, dx: number, dy: number, x: number, y: number) {
        if (element === this.handleElement) {
            const newWidth = Math.max(minSwimLaneWidth + this.gantt.options.padding * 2, this.widthDrag + x);
            if (newWidth !== this.width) {
                const diff = newWidth - this.width;
                this.width = newWidth;
                this.updatePositions();
                this.swimlanesSvg.swimlaneResizing(this, diff);
            }
        }
    }

    public handleDragEnd(element: any) {
        this.widthDrag = null;
        this.xDrag = null;
        this.handleHeightDrag = null;
        this.heightsDrag = null;
        this.ysDrag = null;
    }

    public onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.onEscapeKeyUp();
        }
    }

    private onEscapeKeyUp() {
        let positionUpdated = false;
        if (this.xDrag) {
            this.x = this.xDrag;
            this.xDrag = null;
            positionUpdated = true;
        }
        if (this.widthDrag) {
            this.width = this.widthDrag;
            this.widthDrag = null;
            positionUpdated = true;
        }
        if (this.handleHeightDrag) {
            this.handleHeight = this.handleHeightDrag;
            this.handleHeightDrag = null;
            positionUpdated = true;
        }
        if (this.heightsDrag) {
            this.heights = copyArray(this.heightsDrag);
            this.heightsDrag = null;
            positionUpdated = true;
        }
        if (this.ysDrag) {
            this.ys = copyArray(this.ysDrag);
            this.ysDrag = null;
            positionUpdated = true;
        }
        if (positionUpdated) {
            this.updatePositions();
        }
    }

    private updatePositions() {
        this.rectElements.forEach((element, index) => {
            if (element !== this.rectElements[index - 1]) {
                const height = this.elementHeight(index);
                setAttributes(element, {x: this.x, width: this.width, height, y: this.ys[index]});
            }
        });
        this.textElements.forEach((element, index) => {
            if (element !== this.textElements[index - 1]) {
                const height = this.elementHeight(index);
                setAttributes(element, {x: this.x + this.gantt.options.padding, y: this.ys[index] + height / 2});
            }
        });
        this.headerRectElement && setAttributes(this.headerRectElement, {x: this.x, width: this.width});
        this.headerTextElement && setAttributes(this.headerTextElement, {x: this.x + this.gantt.options.padding});
        this.handleElement && setAttributes(this.handleElement, {height: this.handleHeight, x: this.handleX});
    }

    private elementHeight(index: number): number {
        const element = this.rectElements[index];
        let height = this.heights[index];
        for (let i = index + 1; i < this.rectElements.length; i++) {
            if (this.rectElements[i] === element) {
                height += this.heights[i];
            } else {
                break;
            }
        }
        return height;
    }

    public moveXPosition(diff: number) {
        this.x += diff;
        this.updatePositions();
    }

    public resizeColumn(rowIndex: number, diff: number) {
        this.heights[rowIndex] += diff;
        this.handleHeight += diff;
        for (let i = rowIndex + 1; i < this.ys.length; i++) {
            this.ys[i] += diff;
        }
        this.updatePositions();
    }
}
