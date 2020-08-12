// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, InputBox, QuickInputButtons, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyPackagingStep } from "./SpecifyPackagingStep";

export class SpecifyArtifactIdStep implements IStep {

    public static getInstance(): SpecifyArtifactIdStep {
        return SpecifyArtifactIdStep.specifyArtifactIdStep;
    }

    private static specifyArtifactIdStep: SpecifyArtifactIdStep = new SpecifyArtifactIdStep();

    private lastInput: string;

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "ArtifactId", this.specifyArtifactId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.artifactId === undefined) {
            throw new OperationCanceledError("ArtifactId not specified.");
        }
        return SpecifyPackagingStep.getInstance();
    }

    public async specifyArtifactId(projectMetadata: ProjectMetadata): Promise<boolean> {
        const defaultArtifactId: string = workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            result = await new Promise<boolean>((resolve, reject) => {
                const inputBox: InputBox = window.createInputBox();
                inputBox.placeholder = "e.g. demo";
                inputBox.prompt = "Input Artifact Id for your project.";
                inputBox.value = (SpecifyArtifactIdStep.getInstance().lastInput === undefined) ? defaultArtifactId : SpecifyArtifactIdStep.getInstance().lastInput;
                inputBox.ignoreFocusOut = true;
                // TODO: validateInput: artifactIdValidation
                if (projectMetadata.pickSteps.length > 0) {
                    inputBox.buttons = [(QuickInputButtons.Back)];
                    disposables.push(
                        inputBox.onDidTriggerButton((item) => {
                            if (item === QuickInputButtons.Back) {
                                resolve(false);
                            }
                        })
                    );
                }
                disposables.push(
                    inputBox.onDidAccept(() => {
                        projectMetadata.artifactId = inputBox.value;
                        SpecifyArtifactIdStep.getInstance().lastInput = inputBox.value;
                        projectMetadata.pickSteps.push(SpecifyArtifactIdStep.getInstance());
                        resolve(true);
                    }),
                    inputBox.onDidHide(() => {
                        reject();
                    })
                );
                disposables.push(inputBox);
                inputBox.show();
            });
        } finally {
            for (const d of disposables) {
                d.dispose();
            }
        }
        return result;
    }
}
