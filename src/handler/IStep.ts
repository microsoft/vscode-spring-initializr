// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IProjectMetadata } from "./IProjectMetadata";

export interface IStep {
    getNextStep(): IStep | undefined;
    execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined>;
}
