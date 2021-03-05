// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, window } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IValue, serviceManager } from "../model";
import { IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyLanguageStep } from "./SpecifyLanguageStep";

export class SpecifyBootVersionStep implements IStep {

    public static getInstance(): SpecifyBootVersionStep {
        return SpecifyBootVersionStep.specifyBootVersionStep;
    }

    private static specifyBootVersionStep: SpecifyBootVersionStep = new SpecifyBootVersionStep();

    public getNextStep(): IStep | undefined {
        return SpecifyLanguageStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "BootVersion", this.specifyBootVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        sendInfo(operationId, { bootVersion: projectMetadata.bootVersion });
        return this.getNextStep();
    }

    private async specifyBootVersion(projectMetadata: IProjectMetadata): Promise<boolean> {
        const disposables: Disposable[] = [];
        const result: boolean = await new Promise<boolean>(async (resolve, reject) => {
            const pickBox: QuickPick<{ value: IValue, label: string }> = window.createQuickPick<{ value: IValue, label: string }>();
            pickBox.title = "Spring Initializr: Specify Spring Boot version",
            pickBox.placeholder = "Specify Spring Boot version.";
            try {
                pickBox.items = await serviceManager.getBootVersions(projectMetadata.serviceUrl).then(versions => versions.map(v => ({ value: v, label: v.name })));
            } catch (error) {
                return reject(error);
            }
            pickBox.ignoreFocusOut = true;
            if (projectMetadata.pickSteps.length > 0) {
                pickBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    pickBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            return resolve(false);
                        }
                    })
                );
            }
            disposables.push(
                pickBox.onDidAccept(() => {
                    if (!pickBox.selectedItems[0]) {
                        return;
                    }
                    projectMetadata.bootVersion = pickBox.selectedItems[0] && pickBox.selectedItems[0].value && pickBox.selectedItems[0].value.id;
                    projectMetadata.pickSteps.push(SpecifyBootVersionStep.getInstance());
                    return resolve(true);
                }),
                pickBox.onDidHide(() => {
                    return reject(new OperationCanceledError("BootVersion not specified."));
                })
            );
            disposables.push(pickBox);
            pickBox.show();
        });
        for (const d of disposables) {
            d.dispose();
        }
        return result;
    }
}
