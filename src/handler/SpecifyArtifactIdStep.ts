// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyPackagingStep } from "./SpecifyPackagingStep";
import { createInputBox, IInputMetaData } from "./utils";

export class SpecifyArtifactIdStep implements IStep {

    public static getInstance(): SpecifyArtifactIdStep {
        return SpecifyArtifactIdStep.specifyArtifactIdStep;
    }

    private static specifyArtifactIdStep: SpecifyArtifactIdStep = new SpecifyArtifactIdStep();

    private lastInput: string;

    public getLastInput(): string {
        return this.lastInput;
    }

    public setLastInput(lastInput: string): void {
        this.lastInput = lastInput;
    }

    public getNextStep(): IStep | undefined {
        return SpecifyPackagingStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "ArtifactId", this.specifyArtifactId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.artifactId === undefined) {
            throw new OperationCanceledError("ArtifactId not specified.");
        }
        return this.getNextStep();
    }

    private async specifyArtifactId(projectMetadata: ProjectMetadata): Promise<boolean> {
        const defaultArtifactId: string = workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            const inputMetaData: IInputMetaData = {
                metadata: projectMetadata,
                disposableItems: disposables,
                pickStep: SpecifyArtifactIdStep.getInstance(),
                placeholder: "e.g. demo",
                prompt: "Input Artifact Id for your project.",
                defaultValue: defaultArtifactId
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
