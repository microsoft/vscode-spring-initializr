// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";

export class SpecifyJavaVersionStep implements IStep {

    public static getInstance(): SpecifyJavaVersionStep {
        return SpecifyJavaVersionStep.specifyJavaVersionStep;
    }

    private static specifyJavaVersionStep: SpecifyJavaVersionStep = new SpecifyJavaVersionStep();

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "JavaVersion", this.specifyJavaVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.javaVersion === undefined) {
            throw new OperationCanceledError("Java version not specified.");
        }
        return SpecifyGroupIdStep.getInstance();
    }

    private async specifyJavaVersion(projectMetadata: ProjectMetadata): Promise<boolean> {
        const javaVersion: string = workspace.getConfiguration("spring.initializr").get<string>("defaultJavaVersion");
        let result: boolean = false;
        if (!javaVersion) {
            const disposables: Disposable[] = [];
            try {
                result = await new Promise<boolean>((resolve, reject) => {
                    const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                    pickBox.placeholder = "Specify Java version.";
                    pickBox.items = [{label: "11"}, {label: "1.8"}, {label: "14"}];
                    pickBox.ignoreFocusOut = true;
                    if (projectMetadata.pickSteps.length > 0) {
                        pickBox.buttons = [(QuickInputButtons.Back)];
                        disposables.push(
                            pickBox.onDidTriggerButton((item) => {
                                if (item === QuickInputButtons.Back) {
                                    resolve(false);
                                }
                            })
                        );
                    }
                    disposables.push(
                        pickBox.onDidAccept(() => {
                            projectMetadata.javaVersion = pickBox.selectedItems[0].label;
                            projectMetadata.pickSteps.push(SpecifyJavaVersionStep.getInstance());
                            resolve(true);
                        }),
                        pickBox.onDidHide(() => {
                            reject();
                        })
                    );
                    disposables.push(pickBox);
                    pickBox.show();
                });
            } finally {
                for (const d of disposables) {
                    d.dispose();
                }
            }
        } else {
            projectMetadata.javaVersion = javaVersion;
            result = true;
        }
        return result;
    }
}
