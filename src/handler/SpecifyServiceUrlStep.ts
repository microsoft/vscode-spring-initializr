// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyLanguageStep } from "./SpecifyLanguageStep";

const DEFAULT_SERVICE_URL: string = "https://start.spring.io/";

export class SpecifyServiceUrlStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        await instrumentOperationStep(operationId, "serviceUrl", this.specifyServiceUrl)(projectMetadata);
        if (projectMetadata.serviceUrl === undefined) {
            throw new OperationCanceledError("Service URL not specified.");
        }
        return this.nextStep;
    }

    private async specifyServiceUrl(projectMetadata: ProjectMetadata): Promise<void> {
        const configValue = workspace.getConfiguration("spring.initializr").get<string | string[]>("serviceUrl");
        if (typeof configValue === "string") {
            projectMetadata.serviceUrl = configValue;
            return;
        } else if (typeof configValue === "object" && configValue instanceof Array && configValue.length > 0) {
            if (configValue.length === 1) {
                projectMetadata.serviceUrl = configValue[0];
                return;
            }
            projectMetadata.firstStep = specifyServiceUrlStep;
            projectMetadata.serviceUrl = await window.showQuickPick(configValue, { ignoreFocusOut: true, placeHolder: "Select the service URL." });
            return;
        } else {
            projectMetadata.serviceUrl = DEFAULT_SERVICE_URL;
            return;
        }
    }
}

export const specifyServiceUrlStep: SpecifyServiceUrlStep = new SpecifyServiceUrlStep(undefined, specifyLanguageStep);
