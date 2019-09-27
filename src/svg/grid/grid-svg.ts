import {createSVG, setAttributes} from '../../utils/svg.utils';
import {GanttMode, GanttOptions} from '../../model/options';
import {DateScale, diffDates, startOfToday} from '../../utils/date.utils';
import {
    DatesInfo,
    getColumnWidth,
    getDateInfo,
    getSettingsTableHeight,
    getTableHeight,
    stepHoursMultiplier
} from '../../utils/gantt.utils';
import {GanttSvg} from '../gantt-svg';
import {copyArray} from '../../utils/common.utils';

const gridRowClass = 'grid-row';
const rowLineClass = 'row-line';
const tickClass = 'tick';
const todayClass = 'today-highlight';
const taskGridClasses = [gridRowClass, rowLineClass, tickClass, todayClass];

export class GridSvg {

    private gridBackgroundElement: SVGElement;
    private gridRowsElements: SVGElement[] = [];
    private gridLinesElements: SVGElement[] = [];
    private gridTicksElements: SVGElement[] = [];
    private gridHighlightElement: SVGElement;

    private rowHeightsDrag: number[];

    constructor(private gantt: GanttSvg) {
    }

    public render() {
        this.renderGridBackground();
        this.renderGridRows();
        this.renderGridHeader();
        this.renderGridTicks();
        this.renderGridHighlights();
        this.renderDates();
    }

    private renderGridBackground() {
        this.gridBackgroundElement = createSVG('rect', {
            x: 0,
            y: 0,
            width: this.gantt.settings.tableWidth,
            height: getSettingsTableHeight(this.gantt.settings),
            class: 'grid-background',
        }, this.gantt.layers.grid);
    }

    private renderGridRows() {
        const rowsLayer = createSVG('g', {}, this.gantt.layers.grid);
        const linesLayer = createSVG('g', {}, this.gantt.layers.grid);

        let rowY = this.gantt.settings.headerHeight;

        for (let i = 0; i < this.gantt.settings.numberRows; i++) {
            const rowHeight = this.gantt.settings.rowHeights[i] || this.gantt.settings.defaultRowHeight;
            this.gridRowsElements[i] = createSVG('rect', {
                    x: 0,
                    y: rowY,
                    width: this.gantt.settings.rowWidth,
                    height: rowHeight,
                    class: gridRowClass,
                }, rowsLayer
            );

            this.gridLinesElements[i] = createSVG('line', {
                x1: 0,
                y1: rowY + rowHeight,
                x2: this.gantt.settings.rowWidth,
                y2: rowY + rowHeight,
                class: rowLineClass
            }, linesLayer);

            rowY += rowHeight;
        }
    }

    private renderGridHeader() {
        const headerHeight = this.gantt.settings.headerHeight;
        createSVG('rect', {
            x: 0,
            y: 0,
            width: this.gantt.settings.rowWidth,
            height: headerHeight,
            class: 'grid-header',
        }, this.gantt.layers.grid);
    }

    private renderGridTicks() {
        let tickX = 0;
        let tickY = this.gantt.settings.headerHeight;

        const height = getSettingsTableHeight(this.gantt.settings);
        for (let date of this.gantt.settings.dates) {
            if (tickX > 0) {
                let tickClasses = tickClass;
                if (this.isTickThick(date)) {
                    tickClasses += ' thick';
                }

                const gridTickElement = createSVG('rect', {
                    x: tickX,
                    y: tickY,
                    height, class: tickClasses,
                }, this.gantt.layers.grid);
                this.gridTicksElements.push(gridTickElement);
            }

            tickX += getColumnWidth(this.gantt.options, date);
        }
    }

    private renderGridHighlights() {
        const supportedModes = [GanttMode.QuarterDay, GanttMode.HalfDay, GanttMode.Day, GanttMode.Week];
        if (!supportedModes.includes(this.gantt.options.viewMode)) {
            return;
        }

        const steps = diffDates(startOfToday(), this.gantt.settings.minDate, DateScale.Hour) / this.gantt.settings.hoursStep;
        const x = steps * getColumnWidth(this.gantt.options);
        const y = 0;
        const width = getColumnWidth(this.gantt.options) / stepHoursMultiplier(this.gantt.options.viewMode);
        const height = getSettingsTableHeight(this.gantt.settings);

        this.gridHighlightElement = createSVG('rect', {
            x,
            y,
            width,
            height,
            class: todayClass,
        }, this.gantt.layers.grid);
    }

    private isTickThick(date: Date): boolean {
        switch (this.gantt.options.viewMode) {
            case GanttMode.Day:
                // monday
                return date.getDate() === 1;
            case GanttMode.Week:
                // first week
                return date.getDate() >= 1 && date.getDate() < 8;
            case GanttMode.Month:
                // quarters
                return date.getMonth() % 3 === 0;
            default:
                return false;
        }
    }

    private renderDates() {
        for (let date of this.getDatesToDraw()) {
            createSVG('text', {
                x: date.lower.x,
                y: date.lower.y,
                class: 'lower-text',
            }, this.gantt.layers.date, date.lower.text);

            const gridRect = this.gantt.layers.grid.getBoundingClientRect();
            if (date.upper && date.upper.x < gridRect.width) {
                createSVG('text', {
                    x: date.upper.x,
                    y: date.upper.y,
                    class: 'upper-text'
                }, this.gantt.layers.date, date.upper.text);
            }
        }
    }

    private getDatesToDraw(): DatesInfo[] {
        let lastDate = null;
        let offsetX = 0;
        return this.gantt.settings.dates.map((date, index) => {
            const options = this.getComputedOptions(date);
            const info = getDateInfo(date, lastDate, index, options, offsetX);
            offsetX += options.columnWidth;
            lastDate = date;
            return info;
        });
    }

    private getComputedOptions(date: Date): GanttOptions {
        return {
            ...this.gantt.options,
            columnWidth: getColumnWidth(this.gantt.options, date),
            headerHeight: this.gantt.settings.headerHeight
        };
    }

    public onLineResized(index: number, diff: number) {
        this.updatePositions(index);
    }

    private updatePositions(index: number) {
        const height = getTableHeight(this.gantt.settings.headerHeight, this.gantt.settings.rowHeights);
        setAttributes(this.gridBackgroundElement, {height});
        this.gridHighlightElement && setAttributes(this.gridHighlightElement, {height});
        this.gridTicksElements.forEach(element => setAttributes(element, {height}));

        let rowY = this.gantt.settings.headerHeight;

        for (let i = 0; i < this.gantt.settings.numberRows; i++) {
            const rowHeight = this.gantt.settings.rowHeights[i] || this.gantt.settings.defaultRowHeight;
            if (i >= index) {
                setAttributes(this.gridRowsElements[i], {y: rowY, height: rowHeight});
                setAttributes(this.gridLinesElements[i], {y1: rowY + rowHeight, y2: rowY + rowHeight})
            }

            rowY += rowHeight;
        }
    }

    public handleDragStart(element: any) {
        this.rowHeightsDrag = copyArray(this.gantt.settings.rowHeights);
    }

    public handleDragEnd(element: any) {
        this.rowHeightsDrag = null;
    }

    public onKeyUp(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            this.onEscapeKeyUp();
        }
    }

    private onEscapeKeyUp() {
        if (this.rowHeightsDrag) {
            const firstChangedIndex = this.rowHeightsDrag.findIndex((height, index) => height !== this.gantt.settings.rowHeights[index]);
            if (firstChangedIndex !== -1) {
                this.gantt.settings.rowHeights = copyArray(this.rowHeightsDrag);
                this.updatePositions(firstChangedIndex);
            }
        }
    }

    public isTaskGridElement(element: any): boolean {
        return taskGridClasses.some(gridClass => element.classList.contains(gridClass));
    }

}
