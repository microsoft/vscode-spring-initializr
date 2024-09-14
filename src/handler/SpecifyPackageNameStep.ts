// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { IInputMetaData, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyPackagingStep } from "./SpecifyPackagingStep";
import { createInputBox } from "./utils";

export class SpecifyPackageNameStep implements IStep {

    public static getInstance(): SpecifyPackageNameStep {
        return SpecifyPackageNameStep.specifyPackageNameStep;
    }

    private static specifyPackageNameStep: SpecifyPackageNameStep = new SpecifyPackageNameStep();

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
        this.defaultInput = null;
    }

    public getNextStep(): IStep | undefined {
        return SpecifyPackagingStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "PackageName", this.specifyPackageName)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyPackageName(projectMetadata: IProjectMetadata): Promise<boolean> {
        const recommendedPackageName = `${projectMetadata.groupId}.${projectMetadata.artifactId}`.replace("-", "_");
        
        const inputMetaData: IInputMetaData = {
            metadata: projectMetadata,
            title: "Spring Initializr: Input Package Name",
            pickStep: SpecifyPackageNameStep.getInstance(),
            placeholder: "e.g. com.example",
            prompt: "Input Package Name for your project.",
            defaultValue: recommendedPackageName || SpecifyPackageNameStep.getInstance().defaultInput
        };
        return await createInputBox(inputMetaData);
    }
}
