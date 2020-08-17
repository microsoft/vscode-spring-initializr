// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ProjectMetadata } from "./GenerateProjectHandler";

export interface IStep {
    getNextStep(): IStep | undefined;
    execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined>;
}
