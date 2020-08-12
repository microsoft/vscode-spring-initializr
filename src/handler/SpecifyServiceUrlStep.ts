// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyLanguageStep } from "./SpecifyLanguageStep";

const DEFAULT_SERVICE_URL: string = "https://start.spring.io/";

export class SpecifyServiceUrlStep implements IStep {

    public static getInstance(): SpecifyServiceUrlStep {
        return SpecifyServiceUrlStep.specifyServiceUrlStep;
    }

    private static specifyServiceUrlStep: SpecifyServiceUrlStep = new SpecifyServiceUrlStep();

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        await instrumentOperationStep(operationId, "serviceUrl", this.specifyServiceUrl)(projectMetadata);
        if (projectMetadata.serviceUrl === undefined) {
            throw new OperationCanceledError("Service URL not specified.");
        }
        return SpecifyLanguageStep.getInstance();
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
            projectMetadata.serviceUrl = await window.showQuickPick(configValue, { ignoreFocusOut: true, placeHolder: "Select the service URL." });
            projectMetadata.pickSteps.push(SpecifyServiceUrlStep.getInstance());
            return;
        } else {
            projectMetadata.serviceUrl = DEFAULT_SERVICE_URL;
            return;
        }
    }
}
