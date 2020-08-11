// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyJavaVersionStep } from "./SpecifyJavaVersionStep";
import { specifyServiceUrlStep } from "./SpecifyServiceUrlStep";

export class SpecifyLanguageStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "Language", this.specifyLanguage)(projectMetadata);
        if (projectMetadata.language === undefined) {
            throw new OperationCanceledError("Language not specified.");
        }
        return (executeResult === true) ? this.nextStep : this.lastStep;
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
                    if (projectMetadata.firstStep === specifyServiceUrlStep) {
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

export const specifyLanguageStep: SpecifyLanguageStep = new SpecifyLanguageStep(specifyServiceUrlStep, specifyJavaVersionStep);
