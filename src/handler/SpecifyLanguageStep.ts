// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyJavaVersionStep } from "./SpecifyJavaVersionStep";

export class SpecifyLanguageStep implements IStep {

    public static getInstance(): SpecifyLanguageStep {
        return SpecifyLanguageStep.specifyLanguageStep;
    }

    private static specifyLanguageStep: SpecifyLanguageStep = new SpecifyLanguageStep();

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Language", this.specifyLanguage)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.language === undefined) {
            throw new OperationCanceledError("Language not specified.");
        }
        return SpecifyJavaVersionStep.getInstance();
    }

    private async specifyLanguage(projectMetadata: ProjectMetadata): Promise<boolean> {
        const language: string = workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
        let result: boolean = false;
        if (!language) {
            const disposables: Disposable[] = [];
            try {
                result = await new Promise<boolean>((resolve, reject) => {
                    const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                    pickBox.placeholder = "Specify project language.";
                    pickBox.items = [{label: "Java"}, {label: "Kotlin"}, {label: "Groovy"}];
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
                            projectMetadata.language = pickBox.selectedItems[0].label && pickBox.selectedItems[0].label.toLowerCase();
                            projectMetadata.pickSteps.push(SpecifyLanguageStep.getInstance());
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
            projectMetadata.language = language;
            result = true;
        }
        return result;
    }
}
