import {GanttSvg} from '../gantt-svg';
import {createSVG, setAttributes} from '../../utils/svg.utils';
import {barGroupClass, barGroupWrapperClass, barWrapperClass} from '../lines/bar/bar-svg';
import {computeNearestTickPosition} from '../../utils/gantt.utils';
import {BarsSvg} from '../lines/bar/bars-svg';

export class CreateBarSvg {

    private barWrapperElement: SVGElement;
    private barElement: SVGElement;

    private readonly initialX: number;
    private readonly initialY: number;

    private listeners: { drag?: any, click?: any } = {};
    private currentX: number;

    public get startX(): number {
        return Math.min(this.currentX, this.initialX);
    }

    public get endX(): number {
        return Math.max(this.currentX, this.initialX);
    }

    constructor(private gantt: GanttSvg,
                private barsSvg: BarsSvg,
                startX: number,
                startY: number) {
        const nearestTick = computeNearestTickPosition(gantt.settings, startX);
        this.initialX = nearestTick.x;
        this.initialY = this.barsSvg.getNewBarYPosition(startY);
        this.currentX = nearestTick.x;

        this.renderBar();
        this.bindListeners();
    }

    private renderBar() {
        // same as in bar-svg.ts

        const barWrapperElement = createSVG('g', {
            class: `${barWrapperClass} disabled`,
        }, this.gantt.layers.bar);

        const innerBarGroup = createSVG('g', {
            class: barGroupWrapperClass,
        }, barWrapperElement);

        const barGroupElement = createSVG('g', {
            class: barGroupClass,
        }, innerBarGroup);

        this.barElement = createSVG('rect', {
            x: this.initialX, y: this.initialY, width: 0, height: this.gantt.options.barHeight,
            rx: this.gantt.options.barCornerRadius,
            ry: this.gantt.options.barCornerRadius,
            class: 'bar',
        }, barGroupElement);
    }

    private bindListeners() {
        const _this = this;
        this.listeners.drag = function dragFn(event) {
            _this.onDrag(event.offsetX);
        };

        this.gantt.svgContainer.addEventListener('mousemove', this.listeners.drag);
        this.gantt.svgContainer.addEventListener('touchmove', this.listeners.drag);

        setTimeout(() => {
            _this.listeners.click = function clickFn(event) {
                _this.onClick();
            };
            document.addEventListener('click', _this.listeners.click);
        });

    }

    private onDrag(offsetX: number) {
        const currentXCopy = this.currentX;
        const nearestTick = computeNearestTickPosition(this.gantt.settings, offsetX);
        this.currentX = nearestTick.x;

        if (currentXCopy !== this.currentX) {
            this.updatePosition();
            this.barsSvg.onNewBarDragging(this.startX, this.endX, this.initialY);
        }
    }

    private updatePosition() {
        const x1 = this.startX;
        const x2 = this.endX;
        setAttributes(this.barElement, {x: x1, width: x2 - x1});
    }

    private onClick() {
        this.destroy();
        this.gantt.destroyDragBar();

        if (this.startX !== this.endX) {
            this.gantt.createBar(this.barsSvg, this.startX, this.endX, this.initialY);
        }
    }

    public destroy() {
        if (this.barElement) {
            this.barElement.remove();
            this.barElement = null;
        }
        if (this.barWrapperElement) {
            this.barWrapperElement.remove();
            this.barElement = null;
        }

        this.removeListeners();
    }

    private removeListeners() {
        if (this.listeners) {
            this.gantt.svgContainer.removeEventListener('mousemove', this.listeners.drag);
            this.gantt.svgContainer.removeEventListener('touchmove', this.listeners.drag);
            document.removeEventListener('click', this.listeners.click);
        }
    }
}
