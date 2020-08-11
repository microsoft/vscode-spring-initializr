// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, InputBox, QuickInputButtons, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { specifyJavaVersionStep } from "./SpecifyJavaVersionStep";

export class SpecifyGroupIdStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "GroupId", this.specifyGroupId)(projectMetadata);
        if (projectMetadata.groupId === undefined) {
            throw new OperationCanceledError("GroupId not specified.");
        }
        return (executeResult === true) ? this.nextStep : this.lastStep;
    }

    private async specifyGroupId(projectMetadata: ProjectMetadata): Promise<boolean> {
        const defaultGroupId: string = workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            result = await new Promise<boolean>((resolve, reject) => {
                const inputBox: InputBox = window.createInputBox();
                inputBox.placeholder = "e.g. com.example";
                inputBox.prompt = "Input Group Id for your project.";
                inputBox.value = defaultGroupId;
                inputBox.ignoreFocusOut = true;
                // validateInput: groupIdValidation
                inputBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    inputBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(false);
                        }
                    }),
                    inputBox.onDidAccept(() => {
                        projectMetadata.groupId = inputBox.value;
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

export const specifyGroupIdStep: SpecifyGroupIdStep = new SpecifyGroupIdStep(specifyJavaVersionStep, specifyArtifactIdStep);
