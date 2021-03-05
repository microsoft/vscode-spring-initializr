// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See https://docs.spring.io/initializr/docs/current/reference/html/#api-guide
 */
export interface Metadata {
    bootVersion: Category<BootVersion>;
    dependencies: Category<DependencyGroup>;
    packaging: Category<Packaging>;
    javaVersion: Category<JavaVersion>;
    language: Category<Language>;
    type: Category<ProjectType>;
}

export enum MatadataType {
    BOOTVERSION,
    JAVAVERSION,
    LANGUAGE,
    PACKAGING,
}

interface Nameable {
    name: string;
}

export interface Identifiable extends Nameable {
    id: string;
}

interface Category<T extends Nameable> {
    default?: string;
    values: T[];
}

interface ProjectType extends Identifiable {
    action: string;
}

export type BootVersion = Identifiable;
export type Packaging = Identifiable;
export type JavaVersion = Identifiable;
export type Language = Identifiable;

export interface DependencyGroup extends Category<Dependency>, Nameable {
}

export interface Dependency extends Identifiable {
    description?: string;
    versionRange?: string;
}
