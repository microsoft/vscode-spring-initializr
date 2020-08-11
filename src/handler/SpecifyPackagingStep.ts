// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { specifyBootVersionStep } from "./SpecifyBootVersionStep";

export class SpecifyPackagingStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "Packaging", this.specifyPackaging)(projectMetadata);
        if (projectMetadata.packaging === undefined) {
            throw new OperationCanceledError("Packaging not specified.");
        }
        return (executeResult === true) ? this.nextStep : this.lastStep;
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
                    pickBox.buttons = [(QuickInputButtons.Back)];
                    disposables.push(
                        pickBox.onDidTriggerButton((item) => {
                            if (item === QuickInputButtons.Back) {
                                resolve(false);
                            }
                        }),
                        pickBox.onDidAccept(() => {
                            projectMetadata.packaging = pickBox.selectedItems[0].label && pickBox.selectedItems[0].label.toLowerCase();
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
        }
        return result;
    }
}

export const specifyPackagingStep: SpecifyPackagingStep = new SpecifyPackagingStep(specifyArtifactIdStep, specifyBootVersionStep);
