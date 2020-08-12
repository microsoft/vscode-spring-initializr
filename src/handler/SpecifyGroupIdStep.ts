// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, InputBox, QuickInputButtons, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";

export class SpecifyGroupIdStep implements IStep {

    public static getInstance(): SpecifyGroupIdStep {
        return SpecifyGroupIdStep.specifyGroupIdStep;
    }

    private static specifyGroupIdStep: SpecifyGroupIdStep = new SpecifyGroupIdStep();

    private lastInput: string;

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "GroupId", this.specifyGroupId)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.groupId === undefined) {
            throw new OperationCanceledError("GroupId not specified.");
        }
        return SpecifyArtifactIdStep.getInstance();
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
                inputBox.value = (SpecifyGroupIdStep.getInstance().lastInput === undefined) ? defaultGroupId : SpecifyGroupIdStep.getInstance().lastInput;
                inputBox.ignoreFocusOut = true;
                // TODO: validateInput: groupIdValidation
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
                        projectMetadata.groupId = inputBox.value;
                        SpecifyGroupIdStep.getInstance().lastInput = inputBox.value;
                        projectMetadata.pickSteps.push(SpecifyGroupIdStep.getInstance());
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
