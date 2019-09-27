import {BarSvg} from '../lines/bar/bar-svg';
import {GanttSvg} from '../gantt-svg';
import {createSVG, setAttribute} from '../../utils/svg.utils';
import {createArrowPath} from '../../utils/arrow.utils';
import {arrowClass} from '../lines/bar/arrow-svg';

export class CreateArrowsSvg {


    private readonly initialOffsetX: number;
    private readonly initialOffsetY: number;

    private arrowElements: SVGElement[];
    private listeners: { drag?: any, click?: any } = {};
    private paths: string[];
    private selectedToBars: BarSvg[];
    private fromBars: BarSvg[];

    constructor(private fromBar: BarSvg, private possibleToBars: BarSvg[], private gantt: GanttSvg) {
        this.paths = [this.createDragPath(0, 0)];
        this.arrowElements = [this.createElement(this.paths[0])];
        this.bindListeners();

        this.initialOffsetX = fromBar.endEndpointCX;
        this.initialOffsetY = fromBar.endEndpointCY;
    }

    private createElement(path: string): SVGElement {
        return createSVG('path', {
            d: path,
            class: arrowClass,
        }, this.gantt.layers.arrow);
    }

    private bindListeners() {
        const _this = this;
        this.listeners.drag = function dragFn(event) {
            _this.onDrag(event.offsetX, event.offsetY);
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

    private onClick() {
        if (this.selectedToBars && this.selectedToBars.length) {
            this.gantt.createArrows(this.fromBars || [this.fromBar], this.selectedToBars);
        }
        this.destroy();
        this.gantt.destroyDragArrow();
    }

    private onDrag(offsetX: number, offsetY: number) {
        this.selectedToBars = this.findToBarByClientPosition(offsetX, offsetY);
        if (this.selectedToBars.length) {
            this.fromBars = this.gantt.linesSvg.getSameLockedBars(this.fromBar);
            this.paths = this.fromBars.reduce((arr, fromBar) => {
                arr.push(...this.selectedToBars.map(bar => createArrowPath(fromBar, bar, this.gantt)));
                return arr;
            }, []);
        } else {
            this.fromBars = null;
            this.paths = [this.createDragPath(offsetX - this.initialOffsetX, offsetY - this.initialOffsetY)];
        }
        this.updatePosition();
    }

    private findToBarByClientPosition(clientX: number, clientY: number): BarSvg[] {
        const intersectBar = (this.possibleToBars || []).find(bar => {
            return bar.startX <= clientX && bar.endX >= clientX && bar.getY <= clientY && (bar.getY + bar.getHeight) >= clientY;
        });
        if (intersectBar) {
            return this.possibleToBars.filter(bar => bar.task.taskId === intersectBar.task.taskId);
        }
        return [];
    }

    private createDragPath(offsetX: number, offsetY: number) {
        const startX = this.fromBar.endEndpointCX;
        const startY = this.fromBar.startEndpointCY;
        return `M ${startX} ${startY}
                L ${startX + offsetX} ${startY + offsetY}`;
    }

    private updatePosition() {
        for (let i = 0; i < this.paths.length; i++) {
            if (this.arrowElements[i]) {
                setAttribute(this.arrowElements[i], 'd', this.paths[i]);
            } else {
                this.arrowElements[i] = this.createElement(this.paths[i]);
            }
        }

        for (let i = this.paths.length; i < this.arrowElements.length; i++) {
            setAttribute(this.arrowElements[i], 'd', '');
        }
    }

    public destroy() {
        this.paths = null;
        this.arrowElements && this.arrowElements.forEach(element => element.remove());
        this.fromBar.onCreateArrowDestroyed();

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
