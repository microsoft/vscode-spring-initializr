// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IProjectMetadata } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { createInputBox, IInputMetaData } from "./utils";

export class SpecifyGroupIdStep implements IStep {

    public static getInstance(): SpecifyGroupIdStep {
        return SpecifyGroupIdStep.specifyGroupIdStep;
    }

    private static specifyGroupIdStep: SpecifyGroupIdStep = new SpecifyGroupIdStep();

    private lastInput: string;

    public getNextStep(): IStep | undefined {
        return SpecifyArtifactIdStep.getInstance();
    }

    public getLastInput(): string {
        return this.lastInput;
    }

    public setLastInput(lastInput: string): void {
        this.lastInput = lastInput;
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "GroupId", this.specifyGroupId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.groupId === undefined) {
            throw new OperationCanceledError("GroupId not specified.");
        }
        return this.getNextStep();
    }

    private async specifyGroupId(projectMetadata: IProjectMetadata): Promise<boolean> {
        const defaultGroupId: string = workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
        const inputMetaData: IInputMetaData = {
            metadata: projectMetadata,
            pickStep: SpecifyGroupIdStep.getInstance(),
            placeholder: "e.g. com.example",
            prompt: "Input Group Id for your project.",
            defaultValue: defaultGroupId
        };
        return await createInputBox(inputMetaData);
    }
}
