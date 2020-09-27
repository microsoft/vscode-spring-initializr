// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IDependenciesItem } from "../DependencyManager";
import { IStep } from "./IStep";

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