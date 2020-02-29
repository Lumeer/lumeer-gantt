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

export interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    swimlanes: Swimlane[];
    dependencies: string[];
    allowedDependencies: string[];
    barColor?: string,
    progressColor?: string;
    textColor?: string;

    minProgress?: number;
    maxProgress?: number;

    startDrag: boolean;
    endDrag: boolean;
    progressDrag: boolean;
    editable: boolean;

    metadata?: any;
}

export interface Swimlane {
    value?: any;
    title: string;
    data?: any;
    background?: string;
    color?: string;
    avatarUrl?: string;
}

export const taskProperties = ['id', 'name', 'start', 'end', 'progress', 'swimlanes',
    'dependencies', 'allowedDependencies', 'barColor', 'progressColor', 'textColor',
    'startDrag', 'endDrag', 'progressDrag', 'editable', 'minProgress', 'maxProgress'];

export interface GanttTask extends Task {
    taskId: string;
    startDate: Date;
    endDate: Date;

    parentDependencies: string[];
    transitiveDependencies: string[];
    parentTransitiveDependencies: string[];
}
