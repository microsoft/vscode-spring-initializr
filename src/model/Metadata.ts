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

interface Nameable {
    name: string;
}

interface Identifiable extends Nameable {
    id: string;
}

interface Category<T extends Nameable> {
    default?: string;
    values: T[];
}

interface ProjectType extends Identifiable {
    action: string;
}

type BootVersion = Identifiable;
type Packaging = Identifiable;
type JavaVersion = Identifiable;
type Language = Identifiable;

export interface DependencyGroup extends Category<Dependency>, Nameable {
}

export interface Dependency extends Identifiable {
    description?: string;
    versionRange?: string;
}
