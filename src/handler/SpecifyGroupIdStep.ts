// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { IInputMetaData, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { createInputBox } from "./utils";

export class SpecifyGroupIdStep implements IStep {

    public static getInstance(): SpecifyGroupIdStep {
        return SpecifyGroupIdStep.specifyGroupIdStep;
    }

    private static specifyGroupIdStep: SpecifyGroupIdStep = new SpecifyGroupIdStep();

    private defaultInput: string;

    constructor() {
        this.resetDefaultInput();
    }

    public getDefaultInput(): string {
        return this.defaultInput;
    }

    public setDefaultInput(defaultInput: string): void {
        this.defaultInput = defaultInput;
    }

    public resetDefaultInput(): void {
        this.defaultInput = workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
    }

    public getNextStep(): IStep | undefined {
        return SpecifyArtifactIdStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "GroupId", this.specifyGroupId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyGroupId(projectMetadata: IProjectMetadata): Promise<boolean> {
        const inputMetaData: IInputMetaData = {
            metadata: projectMetadata,
            title: "Spring Initializr: Input Group Id",
            pickStep: SpecifyGroupIdStep.getInstance(),
            placeholder: "e.g. com.example",
            prompt: "Input Group Id for your project.",
            defaultValue: projectMetadata.defaults.groupId || SpecifyGroupIdStep.getInstance().defaultInput
        };
        return await createInputBox(inputMetaData);
    }
}
