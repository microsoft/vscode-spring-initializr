// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, window } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IValue, serviceManager } from "../model";
import { IProjectMetadata } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyDependenciesStep } from "./SpecifyDependenciesStep";

export class SpecifyBootVersionStep implements IStep {

    public static getInstance(): SpecifyBootVersionStep {
        return SpecifyBootVersionStep.specifyBootVersionStep;
    }

    private static specifyBootVersionStep: SpecifyBootVersionStep = new SpecifyBootVersionStep();

    public getNextStep(): IStep | undefined {
        return SpecifyDependenciesStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "BootVersion", this.specifyBootVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.bootVersion === undefined) {
            throw new OperationCanceledError("BootVersion not specified.");
        }
        sendInfo(operationId, { bootVersion: projectMetadata.bootVersion });
        return this.getNextStep();
    }

    private async specifyBootVersion(projectMetadata: IProjectMetadata): Promise<boolean> {
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            result = await new Promise<boolean>(async (resolve, reject) => {
                const pickBox: QuickPick<{ value: IValue, label: string }> = window.createQuickPick<{ value: IValue, label: string }>();
                pickBox.placeholder = "Specify Spring Boot version.";
                pickBox.items = await serviceManager.getBootVersions(projectMetadata.serviceUrl).then(versions => versions.map(v => ({ value: v, label: v.name })));
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
                        projectMetadata.bootVersion = pickBox.selectedItems[0] && pickBox.selectedItems[0].value && pickBox.selectedItems[0].value.id;
                        projectMetadata.pickSteps.push(SpecifyBootVersionStep.getInstance());
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
        return result;
    }
}
