// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependenciesItem } from "../DependencyManager";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyBootVersionStep } from "./SpecifyBootVersionStep";

export class SpecifyDependenciesStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "Dependencies", this.specifyDependencies)(projectMetadata);
        sendInfo(operationId, { depsType: projectMetadata.dependencies.itemType, dependencies: projectMetadata.dependencies.id });
        return (executeResult === true) ? this.nextStep : this.lastStep;
    }

    private async specifyDependencies(projectMetadata: ProjectMetadata): Promise<IDependenciesItem> {
        const dependencyManager = new DependencyManager();
        let current: IDependenciesItem = null;
        let result: boolean = false;
        const disposables: Disposable[] = [];
        do {
            try {
                const quickPickItems: Array<QuickPickItem & IDependenciesItem> = await dependencyManager.getQuickPickItems(projectMetadata.serviceUrl, projectMetadata.bootVersion, { hasLastSelected: true });
                result = await new Promise<boolean>(async (resolve, reject) => {
                    const pickBox: QuickPick<QuickPickItem & IDependenciesItem> = window.createQuickPick<QuickPickItem & IDependenciesItem>();
                    pickBox.placeholder = "Search for dependencies.";
                    pickBox.items = quickPickItems;
                    pickBox.ignoreFocusOut = true;
                    pickBox.matchOnDetail = true;
                    pickBox.matchOnDescription = true;
                    pickBox.buttons = [(QuickInputButtons.Back)];
                    disposables.push(
                        pickBox.onDidTriggerButton((item) => {
                            if (item === QuickInputButtons.Back) {
                                resolve(false);
                            }
                        }),
                        pickBox.onDidAccept(() => {
                            current = pickBox.selectedItems[0];
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
            if (current && current.itemType === "dependency") {
                dependencyManager.toggleDependency(current.id);
            }
        } while (current && current.itemType === "dependency");
        if (!current) {
            throw new OperationCanceledError("Canceled on dependency seletion.");
        }
        dependencyManager.updateLastUsedDependencies(projectMetadata.dependencies);
        projectMetadata.dependencies = current;
        return current;
    }
}

export const specifyDependenciesStep: SpecifyDependenciesStep = new SpecifyDependenciesStep(specifyBootVersionStep, undefined);
