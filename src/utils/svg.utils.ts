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

import {isNumeric, toNumber} from './common.utils';

export function createSVG(tag: string, attributes: Record<string, any>, appendTo?: HTMLElement | SVGElement, innerHTML?: string): SVGGraphicsElement {
    const svgElement: SVGGraphicsElement = document.createElementNS('http://www.w3.org/2000/svg', tag) as SVGGraphicsElement;
    if (innerHTML) {
        svgElement.innerHTML = innerHTML;
    }

    Object.entries(attributes || {})
        .forEach(([attribute, value]) => svgElement.setAttribute(attribute, value));

    if (appendTo) {
        appendTo.appendChild(svgElement);
    }

    return svgElement;
}

export function setAttributes(element: Element, attributes: Record<string, any>) {
    Object.keys(attributes || {})
        .forEach(key => setAttribute(element, key, attributes[key]));
}

export function setAttribute(element: Element, attribute: string, value: any) {
    element?.setAttribute(attribute, value);
}

export function setOpacity(element: Element) {

}

export function addToAttribute(element: Element, attribute: string, dx: number) {
    if (element?.hasAttribute(attribute)) {
        const value = +element.getAttribute(attribute);
        setAttribute(element, attribute, value + dx);
    }
}

export function showElements(...elements) {
    elements.forEach(element => showElement(element))
}

export function showElement(element: Element) {
    element && setAttribute(element, 'display', 'visible');
}

export function hideElements(...elements) {
    elements.forEach(element => hideElement(element))
}

export function hideElement(element: Element) {
    element && setAttribute(element, 'display', 'none');
}

export function getX(element: Element): number {
    return +element?.getAttribute('x');
}

export function getY(element: Element): number {
    return +element?.getAttribute('y');
}

export function getCX(element: Element): number {
    return +element?.getAttribute('cx');
}

export function getCY(element: Element): number {
    return +element?.getAttribute('cy');
}

export function getWidth(element: Element): number {
    return +element?.getAttribute('width');
}

export function getHeight(element: Element): number {
    return +element?.getAttribute('height');
}

export function getEndX(element: Element): number {
    return getX(element) + getWidth(element);
}

export function animateSVG(element: SVGElement, attribute: string, from: number, to: number) {
    const animatedSvgElement = getAnimationElement(element, attribute, from, to);

    if (animatedSvgElement === element) {
        // triggered 2nd time programmatically
        // trigger artificial click event
        const event = document.createEvent('HTMLEvents');
        event.initEvent('click', true, true);
        (event as any).eventName = 'click';
        animatedSvgElement.dispatchEvent(event);
    }
}

function getAnimationElement(
    svgElement: SVGElement,
    attribute: string,
    from: number,
    to: number,
    duration = '0.4s',
    begin = '0.1s'
) {
    const animEl = svgElement.querySelector('animate');
    if (animEl) {
        setAttributes(animEl, {
            attributeName: attribute,
            from,
            to,
            dur: duration,
            begin: 'click + ' + begin // artificial click
        });
        return svgElement;
    }

    const animateElement = createSVG('animate', {
        attributeName: attribute,
        from,
        to,
        dur: duration,
        begin,
        calcMode: 'spline',
        values: from + ';' + to,
        keyTimes: '0; 1',
        keySplines: cubic_bezier('ease-out')
    });
    svgElement.appendChild(animateElement);

    return svgElement;
}

function cubic_bezier(name: string) {
    return {
        ease: '.25 .1 .25 1',
        linear: '0 0 1 1',
        'ease-in': '.42 0 1 1',
        'ease-out': '0 0 .58 1',
        'ease-in-out': '.42 0 .58 1'
    }[name];
}

export function createMarkerPath(x: number, y: number, scale = 3): string {
    const {height} = getMarkerSize(scale);

    const points = [
        ['c', 1.1, 0, 2.2, 0.5, 3, 1.3],
        ['c', 0.8, 0.9, 1.3, 1.9, 1.3, 3.1],
        ['s', -0.5, 2.5, -1.3, 3.3],
        ['l', -3, 3.1],
        ['l', -3, -3.1],
        ['c', -0.8, -0.8, -1.3, -2, -1.3, -3.3],
        ['c', 0, -1.2, 0.4, -2.2, 1.3, -3.1],
        ['c', 0.8, -0.8, 1.9, -1.3, 3, -1.3],
    ];

    const path = points.reduce((str, p) => {
        const part = p.map(v => isNumeric(v) ? (toNumber(v) * scale).toFixed(1) : v).join(' ');
        return `${str} ${part}`;
    }, '');

    return `M${x} ${y - height} ${path} Z`;
}

export function getMarkerSize(scale = 3): { width: number, height: number } {
    const width = 8.6 * scale;
    const height = 10.8 * scale;
    return {width, height};
}

export function createDeleteIconElement(x: number, y: number, parent: HTMLElement | SVGElement): SVGElement {
    const svg = createSVG('svg', {viewBox: '0 0 448 512', width: 17, height: 17, class: 'icon-delete', x, y}, parent);
    createSVG('path', {d: createTrashPath()}, svg);
    return svg;
}

export function createCheckboxElement(x: number, y: number, size: number, checked: boolean, parent: HTMLElement | SVGElement): SVGElement {
    const svg = createSVG('svg', {viewBox: '0 0 24 24', width: size, height: size, x, y}, parent);
    if (checked) {
        createSVG('path', {d: 'M10.041 17l-4.5-4.319 1.395-1.435 3.08 2.937 7.021-7.183 1.422 1.409-8.418 8.591zm-5.041-15c-1.654 0-3 1.346-3 3v14c0 1.654 1.346 3 3 3h14c1.654 0 3-1.346 3-3v-14c0-1.654-1.346-3-3-3h-14zm19 3v14c0 2.761-2.238 5-5 5h-14c-2.762 0-5-2.239-5-5v-14c0-2.761 2.238-5 5-5h14c2.762 0 5 2.239 5 5z'}, svg);
    } else {
        createSVG('path', {d: 'M5 2c-1.654 0-3 1.346-3 3v14c0 1.654 1.346 3 3 3h14c1.654 0 3-1.346 3-3v-14c0-1.654-1.346-3-3-3h-14zm19 3v14c0 2.761-2.238 5-5 5h-14c-2.762 0-5-2.239-5-5v-14c0-2.761 2.238-5 5-5h14c2.762 0 5 2.239 5 5z'}, svg);
    }
    return svg;
}

function createTrashPath(): string {
    return `M32 464
    a48 48 0 0 0 48 48
    h288
    a48 48 0 0 0 48-48
    V128
    H32
    z
    m272-256
    a16 16 0 0 1 32 0
    v224
    a16 16 0 0 1-32 0
    z
    m-96 0
    a16 16 0 0 1 32 0v224
    a16 16 0 0 1-32 0
    z
    m-96 0
    a16 16 0 0 1 32 0
    v224
    a16 16 0 0 1-32 0
    z
    M432 32
    H312
    l-9.4-18.7
    A24 24 0 0 0 281.1 0
    H166.8
    a23.72 23.72 0 0 0-21.4 13.3
    L136 32
    H16
    A16 16 0 0 0 0 48
    v32
    a16 16 0 0 0 16 16
    h416
    a16 16 0 0 0 16-16
    V48
    a16 16 0 0 0-16-16z`;
}

export function getOffset(event: any): { x: number, y: number } {
    const x = Math.max(event.offsetX || 0, event.layerX || 0);
    const y = Math.max(event.offsetY || 0, event.layerY || 0);
    return {x, y};
}
