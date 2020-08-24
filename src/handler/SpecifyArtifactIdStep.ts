// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { IProjectMetadata } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyPackagingStep } from "./SpecifyPackagingStep";
import { createInputBox, IInputMetaData } from "./utils";

export class SpecifyArtifactIdStep implements IStep {

    public static getInstance(): SpecifyArtifactIdStep {
        return SpecifyArtifactIdStep.specifyArtifactIdStep;
    }

    private static specifyArtifactIdStep: SpecifyArtifactIdStep = new SpecifyArtifactIdStep();

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
        this.defaultInput = workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
    }

    public getNextStep(): IStep | undefined {
        return SpecifyPackagingStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "ArtifactId", this.specifyArtifactId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyArtifactId(projectMetadata: IProjectMetadata): Promise<boolean> {
        const inputMetaData: IInputMetaData = {
            metadata: projectMetadata,
            pickStep: SpecifyArtifactIdStep.getInstance(),
            placeholder: "e.g. demo",
            prompt: "Input Artifact Id for your project.",
            defaultValue: SpecifyArtifactIdStep.getInstance().defaultInput
        };
        return await createInputBox(inputMetaData);
    }
}
