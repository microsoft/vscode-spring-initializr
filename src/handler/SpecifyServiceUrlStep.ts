// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyBootVersionStep } from "./SpecifyBootVersionStep";
import { specifyServiceUrl } from "./utils";

export class SpecifyServiceUrlStep implements IStep {

    public static getInstance(): SpecifyServiceUrlStep {
        return SpecifyServiceUrlStep.specifyServiceUrlStep;
    }

    private static specifyServiceUrlStep: SpecifyServiceUrlStep = new SpecifyServiceUrlStep();

    public getNextStep(): IStep | undefined {
        return SpecifyBootVersionStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        projectMetadata.serviceUrl = await instrumentOperationStep(operationId, "serviceUrl", specifyServiceUrl)(projectMetadata);
        if (projectMetadata.serviceUrl === undefined) {
            throw new OperationCanceledError("Service URL not specified.");
        }
        return this.getNextStep();
    }
}
