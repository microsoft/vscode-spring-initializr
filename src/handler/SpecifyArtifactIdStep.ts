// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, InputBox, QuickInputButtons, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyGroupIdStep } from "./SpecifyGroupIdStep";
import { specifyPackagingStep } from "./SpecifyPackagingStep";

export class SpecifyArtifactIdStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "ArtifactId", this.specifyArtifactId)(projectMetadata);
        if (projectMetadata.artifactId === undefined) {
            throw new OperationCanceledError("ArtifactId not specified.");
        }
        return (executeResult === true) ? this.nextStep : this.lastStep;
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
                inputBox.value = defaultArtifactId;
                inputBox.ignoreFocusOut = true;
                // validateInput: artifactIdValidation
                inputBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    inputBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(false);
                        }
                    }),
                    inputBox.onDidAccept(() => {
                        projectMetadata.artifactId = inputBox.value;
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

export const specifyArtifactIdStep: SpecifyArtifactIdStep = new SpecifyArtifactIdStep(specifyGroupIdStep, specifyPackagingStep);
