// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
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

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "GroupId", this.specifyGroupId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.groupId === undefined) {
            throw new OperationCanceledError("GroupId not specified.");
        }
        return this.getNextStep();
    }

    private async specifyGroupId(projectMetadata: ProjectMetadata): Promise<boolean> {
        const defaultGroupId: string = workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            const inputMetaData: IInputMetaData = {
                metadata: projectMetadata,
                disposableItems: disposables,
                pickStep: SpecifyGroupIdStep.getInstance(),
                placeholder: "e.g. com.example",
                prompt: "Input Group Id for your project.",
                defaultValue: defaultGroupId
            };
            result = await createInputBox(inputMetaData);
        } finally {
            for (const d of disposables) {
                d.dispose();
            }
        }
        return result;
    }
}
