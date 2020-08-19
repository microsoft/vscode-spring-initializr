// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IProjectMetadata } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { createPickBox, IPickMetadata } from "./utils";

export class SpecifyJavaVersionStep implements IStep {

    public static getInstance(): SpecifyJavaVersionStep {
        return SpecifyJavaVersionStep.specifyJavaVersionStep;
    }

    private static specifyJavaVersionStep: SpecifyJavaVersionStep = new SpecifyJavaVersionStep();

    public getNextStep(): IStep | undefined {
        return SpecifyGroupIdStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "JavaVersion", this.specifyJavaVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.javaVersion === undefined) {
            throw new OperationCanceledError("Java version not specified.");
        }
        return this.getNextStep();
    }

    private async specifyJavaVersion(projectMetadata: IProjectMetadata): Promise<boolean> {
        const javaVersion: string = workspace.getConfiguration("spring.initializr").get<string>("defaultJavaVersion");
        if (javaVersion) {
            projectMetadata.javaVersion = javaVersion;
            return true;
        }
        const pickMetaData: IPickMetadata = {
            metadata: projectMetadata,
            pickStep: SpecifyJavaVersionStep.getInstance(),
            placeholder: "Specify Java version.",
            items: [{ label: "11" }, { label: "1.8" }, { label: "14" }]
        };
        return await createPickBox(pickMetaData);
    }
}
