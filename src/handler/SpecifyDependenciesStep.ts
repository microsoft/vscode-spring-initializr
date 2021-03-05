// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependenciesItem } from "../DependencyManager";
import { OperationCanceledError } from "../Errors";
import { IProjectMetadata, IStep } from "./HandlerInterfaces";

export class SpecifyDependenciesStep implements IStep {

    public static getInstance(): SpecifyDependenciesStep {
        return SpecifyDependenciesStep.specifyDependenciesStep;
    }

    private static specifyDependenciesStep: SpecifyDependenciesStep = new SpecifyDependenciesStep();

    public getNextStep(): IStep | undefined {
        return undefined;
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Dependencies", this.specifyDependencies)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        sendInfo(operationId, { depsType: projectMetadata.dependencies.itemType, dependencies: projectMetadata.dependencies.id });
        return this.getNextStep();
    }

    private async specifyDependencies(projectMetadata: IProjectMetadata): Promise<boolean> {
        const dependencyManager = new DependencyManager();
        let current: IDependenciesItem = null;
        let result: boolean = false;
        const disposables: Disposable[] = [];
        dependencyManager.selectedIds = projectMetadata.defaults.dependencies || [];
        do {
            const quickPickItems: Array<QuickPickItem & IDependenciesItem> = await dependencyManager.getQuickPickItems(projectMetadata.serviceUrl, projectMetadata.bootVersion, { hasLastSelected: true });
            result = await new Promise<boolean>(async (resolve, reject) => {
                const pickBox: QuickPick<QuickPickItem & IDependenciesItem> = window.createQuickPick<QuickPickItem & IDependenciesItem>();
                pickBox.title = "Spring Initializr: Choose dependencies",
                pickBox.placeholder = "Search for dependencies.";
                pickBox.items = quickPickItems;
                pickBox.ignoreFocusOut = true;
                pickBox.matchOnDetail = true;
                pickBox.matchOnDescription = true;
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
                        if (!pickBox.selectedItems[0]) {
                            return;
                        }
                        current = pickBox.selectedItems[0];
                        resolve(true);
                    }),
                    pickBox.onDidHide(() => {
                        reject(new OperationCanceledError("Canceled on dependency selection."));
                    })
                );
                disposables.push(pickBox);
                pickBox.show();
            });
            for (const d of disposables) {
                d.dispose();
            }
            if (!result) {
                return result;
            }
            if (current && current.itemType === "dependency") {
                dependencyManager.toggleDependency(current.id);
            }
        } while (current && current.itemType === "dependency");
        projectMetadata.dependencies = current;
        dependencyManager.updateLastUsedDependencies(current);
        return result;
    }
}
