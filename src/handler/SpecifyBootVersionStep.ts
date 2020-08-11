// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, window } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { IValue, serviceManager } from "../model";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyDependenciesStep } from "./SpecifyDependenciesStep";
import { specifyPackagingStep } from "./SpecifyPackagingStep";

export class SpecifyBootVersionStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "BootVersion", this.specifyBootVersion)(projectMetadata);
        if (projectMetadata.bootVersion === undefined) {
            throw new OperationCanceledError("BootVersion not specified.");
        }
        sendInfo(operationId, { bootVersion: projectMetadata.bootVersion });
        return (executeResult === true) ? this.nextStep : this.lastStep;
    }

    private async specifyBootVersion(projectMetadata: ProjectMetadata): Promise<boolean> {
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            result = await new Promise<boolean>(async (resolve, reject) => {
                const pickBox: QuickPick<{ value: IValue, label: string }> = window.createQuickPick<{ value: IValue, label: string }>();
                pickBox.placeholder = "Specify Spring Boot version.";
                pickBox.items = await serviceManager.getBootVersions(projectMetadata.serviceUrl).then(versions => versions.map(v => ({ value: v, label: v.name })));
                pickBox.ignoreFocusOut = true;
                pickBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    pickBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(false);
                        }
                    }),
                    pickBox.onDidAccept(() => {
                        projectMetadata.bootVersion = pickBox.selectedItems[0] && pickBox.selectedItems[0].value && pickBox.selectedItems[0].value.id;
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

export const specifyBootVersionStep: SpecifyBootVersionStep = new SpecifyBootVersionStep(specifyPackagingStep, specifyDependenciesStep);
