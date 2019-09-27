import moment from 'moment';
import skLocale from 'moment/locale/sk';
import csLocale from 'moment/locale/cs';
import deLocale from 'moment/locale/de';
import esLocale from 'moment/locale/es';
import frLocale from 'moment/locale/fr';

export enum DateScale {
    Year = 'year',
    Month = 'month',
    Week = 'week',
    Day = 'day',
    Hour = 'hour',
    Second = 'second',
    Millisecond = 'millisecond'
}

export function setupLanguage(language: string) {
    switch (language) {
        case 'sk':
            moment.updateLocale(language, skLocale);
            break;
        case 'cs':
            moment.updateLocale(language, csLocale);
            break;
        case 'de':
            moment.updateLocale(language, deLocale);
            break;
        case 'es':
            moment.updateLocale(language, esLocale);
            break;
        case 'fr':
            moment.updateLocale(language, frLocale);
            break;
    }
}

export function parseDate(date: string | Date, format?: string): Date {
    if (typeof date === 'string') {
        const momentDate = moment.utc(date, format).toDate();
        if (isDateValid(momentDate)) {
            return momentDate;
        }
    }

    return null;
}

export function isDateValid(date: Date): boolean {
    return date && date.getTime && !isNaN(date.getTime());
}

export function startOf(date: Date, scale: DateScale): Date {
    return moment.utc(date).startOf(scale).toDate();
}

export function now(): Date {
    return moment.utc().toDate();
}

export function startOfToday(): Date {
    const date = new Date();
    return moment.utc([date.getFullYear(), date.getMonth(), date.getDate()])
        .startOf('day').toDate();
}

export function addToDate(date: Date, value: number, scale: DateScale): Date {
    return moment.utc(date).add(value, scale).toDate();
}

export function getDaysInMonth(date: Date): number {
    return moment.utc(date).daysInMonth();
}

export function formatDate(date: Date, format: string): string {
    return moment.utc(date).format(format)
}

export function diffDates(d1: Date, d2: Date, scale: DateScale): number {
    return moment.utc(d1).diff(moment.utc(d2), scale);
}

export function isAfter(d1: Date, d2: Date): boolean {
    return d1.getTime() > d2.getTime();
}

export function isBefore(d1: Date, d2: Date): boolean {
    return d1.getTime() < d2.getTime();
}
