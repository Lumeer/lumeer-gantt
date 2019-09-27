import {BarSvg} from './bar-svg';
import {createDeleteIconElement, createSVG, setAttribute} from '../../../utils/svg.utils';
import {GanttSvg} from '../../gantt-svg';
import {createArrowPath} from '../../../utils/arrow.utils';

export const arrowClass = 'arrow';

export class ArrowSvg {

    private arrowElement: SVGElement;
    private arrowClickableElement: SVGElement;
    private arrowClickListener: any;
    private documentClickListener: any;

    private deleteIconElement: SVGElement;
    private deleteClickListener: any;

    private path: string;
    private pathDrag: string;

    constructor(private gantt: GanttSvg,
                public fromBar: BarSvg,
                public toBar: BarSvg) {
    }

    public get drawsFromEnd(): boolean {
        return this.fromBar.endEndpointCX < this.toBar.startEndpointCX;
    }

    public get drawsFromStart(): boolean {
        return !this.drawsFromEnd;
    }

    public render() {
        this.calculatePath();
        this.renderElements();
    }

    private calculatePath() {
        this.path = createArrowPath(this.fromBar, this.toBar, this.gantt);
    }

    private renderElements() {
        this.arrowElement = this.createElementWithClass(arrowClass);
        if (this.fromBar.task.editable && this.toBar.task.editable) {
            this.arrowClickableElement = this.createElementWithClass('arrow-clickable');
            this.arrowClickListener = (event) => this.onArrowClick(event);
            this.arrowClickableElement.addEventListener('click', this.arrowClickListener);
        }
    }

    private onArrowClick(event: MouseEvent) {
        if (this.deleteIconElement) {
            this.resetArrow();
            return;
        }

        if (!this.gantt.preventEventListeners) {
            this.setActive();
            this.gantt.linesSvg.setArrowActive(this.fromBar, this.toBar, true);
            this.deleteIconElement = createDeleteIconElement(event.offsetX + 10, event.offsetY, this.gantt.layers.handle);
            this.deleteClickListener = () => this.deleteArrow();
            this.deleteIconElement.addEventListener('click', this.deleteClickListener);
        }

        setTimeout(() => {
            this.documentClickListener = () => this.resetArrow();
            document.addEventListener('click', this.documentClickListener);
        });
    }

    public setActive() {
        if (!this.arrowElement.classList.contains('active')) {
            this.arrowElement.classList.add('active');
        }
    }

    public removeActive() {
        this.arrowElement.classList.remove('active');
    }

    private resetArrow() {
        this.deleteIconElement && this.deleteIconElement.removeEventListener('click', this.deleteClickListener);
        this.deleteIconElement && this.deleteIconElement.remove();
        this.deleteIconElement = null;
        this.deleteClickListener = null;
        this.removeActive();
        this.gantt.linesSvg.setArrowActive(this.fromBar, this.toBar, false);
        document.removeEventListener('click', this.documentClickListener);
    }

    private deleteArrow() {
        this.resetArrow();
        this.gantt.linesSvg.deleteArrow(this.fromBar, this.toBar);
    }

    private createElementWithClass(className: string): SVGElement {
        return createSVG('path', {
            d: this.path,
            class: className,
        }, this.gantt.layers.arrow);
    }

    public updatePosition() {
        this.calculatePath();
        this.updateElements();
    }

    private updateElements() {
        this.arrowElement && setAttribute(this.arrowElement, 'd', this.path);
        this.arrowClickableElement && setAttribute(this.arrowClickableElement, 'd', this.path);
    }

    public handleDragStart(element: any) {
        this.pathDrag = this.path;
    }

    public handleDragEnd(element: any) {
        this.pathDrag = null;
    }

    public onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.onEscapeKeyUp();
        }
    }

    private onEscapeKeyUp() {
        if (this.pathDrag) {
            if (this.path !== this.pathDrag) {
                this.path = this.pathDrag;
                this.pathDrag = null;
                this.updateElements();
            }
        }
    }

    public destroy() {
        if (this.arrowElement) {
            this.arrowElement.remove();
            this.arrowElement = null;
        }
        if (this.arrowClickableElement) {
            this.arrowClickableElement.remove();
            this.arrowClickableElement = null;
        }
        if (this.deleteIconElement) {
            this.deleteIconElement.remove();
            this.deleteIconElement = null;
        }

        this.arrowClickListener = null;
        this.deleteClickListener = null;

        document.removeEventListener('click', this.documentClickListener);
        this.documentClickListener = null;

    }
}
