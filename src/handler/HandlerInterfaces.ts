// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IDependenciesItem } from "../DependencyManager";

export interface IStep {
    getNextStep(): IStep | undefined;
    execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined>;
}

export interface IProjectMetadata {
    serviceUrl?: string;
    language?: string;
    javaVersion?: string;
    groupId?: string;
    artifactId?: string;
    packaging?: string;
    bootVersion?: string;
    dependencies?: IDependenciesItem;
    pickSteps: IStep[];
    defaults: IDefaultProjectData;
}

export interface IDefaultProjectData {
    language?: string;
    javaVersion?: string;
    groupId?: string;
    artifactId?: string;
    packaging?: string;
    dependencies?: string[];
    targetFolder?: string;
}

export interface IPickMetadata {
    metadata: IProjectMetadata;
    title: string;
    pickStep: IStep;
    placeholder: string;
    items: QuickPickItem[];
}

export interface IInputMetaData {
    metadata: IProjectMetadata;
    title: string;
    pickStep: IStep;
    placeholder: string;
    prompt: string;
    defaultValue: string;
}
