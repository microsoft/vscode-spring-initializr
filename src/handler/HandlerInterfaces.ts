// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IDependenciesItem } from "../DependencyManager";
import { Identifiable } from "../model/Metadata";

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
    parentFolder?: ParentFolder;
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

export interface IHandlerItem<T extends Identifiable> extends QuickPickItem {
    label: string;
    value?: T;
}

export interface IPickMetadata<T extends Identifiable> {
    metadata: IProjectMetadata;
    title: string;
    pickStep: IStep;
    placeholder: string;
    items: Array<IHandlerItem<T>> | Promise<Array<IHandlerItem<T>>>;
}

export interface IInputMetaData {
    metadata: IProjectMetadata;
    title: string;
    pickStep: IStep;
    placeholder: string;
    prompt: string;
    defaultValue: string;
}

export enum ParentFolder {
    ARTIFACT_ID = "artifactId",
    NONE = "none"
}
