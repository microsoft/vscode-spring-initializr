// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyBootVersionStep } from "./SpecifyBootVersionStep";

export class SpecifyPackagingStep implements IStep {

    public static getInstance(): SpecifyPackagingStep {
        return SpecifyPackagingStep.specifyPackagingStep;
    }

    private static specifyPackagingStep: SpecifyPackagingStep = new SpecifyPackagingStep();

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Packaging", this.specifyPackaging)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.packaging === undefined) {
            throw new OperationCanceledError("Packaging not specified.");
        }
        return SpecifyBootVersionStep.getInstance();
    }

    private async specifyPackaging(projectMetadata: ProjectMetadata): Promise<boolean> {
        const packaging: string = workspace.getConfiguration("spring.initializr").get<string>("defaultPackaging");
        let result: boolean = false;
        if (!packaging) {
            const disposables: Disposable[] = [];
            try {
                result = await new Promise<boolean>((resolve, reject) => {
                    const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                    pickBox.placeholder = "Specify packaging type.";
                    pickBox.items = [{label: "JAR"}, {label: "WAR"}];
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
                            projectMetadata.packaging = pickBox.selectedItems[0].label && pickBox.selectedItems[0].label.toLowerCase();
                            projectMetadata.pickSteps.push(SpecifyPackagingStep.getInstance());
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
            projectMetadata.packaging = packaging;
            result = true;
        }
        return result;
    }
}
