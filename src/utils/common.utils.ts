export function deepObjectsEquals(o1: any, o2: any): boolean {
    return JSON.stringify(o1) === JSON.stringify(o2);
}

export function isNullOrUndefined(object: any): object is null | undefined {
    return object === null || object === undefined;
}

export function isNotNullOrUndefined(object: any): boolean {
    return !isNullOrUndefined(object);
}

export function copyArray<T>(arr: T[]): T[] {
    return [...(arr || [])];
}

export function copyMatrix<T>(matrix: T[][]): T[][] {
    return [...(matrix || [])].map(m => [...m || []]);
}

export function arraySubtract<T>(array1: T[], array2: T[]): T[] {
    const a = array1 || [];
    const b = array2 || [];
    return a.filter(x => !b.includes(x));
}

export function isArray<T>(input?: any): input is T[] {
    return Array.isArray(input);
}

export function arrayContainsSameItems(a1: any[], a2: any): boolean {
    if ((a1 || []).length !== (a2 || []).length) {
        return false;
    }

    return arraySubtract(a1, a2).length === 0;
}

export function mergeFlatObjects<T>(a: T, b: T): T {
    const result = {...a};
    Object.keys(b || {}).forEach(key => {
        const bValue = b[key];
        if (isNotNullOrUndefined(bValue) && bValue !== '') {
            if (isNumeric(bValue)) {
                result[key] = toNumber(bValue) > 0 ? toNumber(bValue) : a[key];
            } else {
                result[key] = bValue;
            }
        }
    });

    return result;
}

export function isNumeric(value: any): boolean {
    if (typeof value === 'boolean' || (value && String(value).trim() === '')) {
        return false;
    }
    return !isNaN(toNumber(value));
}

export function toNumber(value: any): number {
    const val =
        value &&
        value
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.');

    return Number(val);
}

export function uniqueValues<T>(values: T[]): T[] {
    return Array.from<T>(new Set(values));
}

export function completeArrayWithNulls<T>(array: T[], num: number): T[] {
    const arr = [...array || []];
    for (let i = arr.length; i < num; i++) {
        arr[i] = null;
    }
    return arr;
}

export function addEventListenerForSelector(element: any, event: string, selector: string, callback: (event: Event, element: any) => void) {
    element.addEventListener(event, ev => {
        const anyEvent = ev as any;
        const delegatedTarget = anyEvent.closest(selector);
        if (delegatedTarget) {
            anyEvent.delegatedTarget = delegatedTarget;
            callback.call(this, ev, delegatedTarget);
        }
    })
}

export function closestElement(selector: string, element: any): Element {
    if (!element) return null;

    if (element.matches && element.matches(selector)) {
        return element;
    }

    return closestElement(selector, element.parentNode);
}
