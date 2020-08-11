// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { specifyGroupIdStep } from "./SpecifyGroupIdStep";
import { specifyLanguageStep } from "./SpecifyLanguageStep";

export class SpecifyJavaVersionStep implements IStep {

    public lastStep: IStep | undefined;
    public nextStep: IStep | undefined;

    constructor(lastStep: IStep | undefined, nextStep: IStep | undefined) {
        this.lastStep = lastStep;
        this.nextStep = nextStep;
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        const executeResult: boolean = await instrumentOperationStep(operationId, "JavaVersion", this.specifyJavaVersion)(projectMetadata);
        if (projectMetadata.javaVersion === undefined) {
            throw new OperationCanceledError("Java version not specified.");
        }
        return (executeResult === true) ? this.nextStep : this.lastStep;
    }

    private async specifyJavaVersion(projectMetadata: ProjectMetadata): Promise<boolean> {
        const javaVersion: string = workspace.getConfiguration("spring.initializr").get<string>("defaultJavaVersion");
        let result: boolean = false;
        if (!javaVersion) {
            const disposables: Disposable[] = [];
            try {
                result = await new Promise<boolean>((resolve, reject) => {
                    const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                    pickBox.placeholder = "Specify project language.";
                    pickBox.items = [{label: "Java"}, {label: "Kotlin"}, {label: "Groovy"}];
                    pickBox.ignoreFocusOut = true;
                    pickBox.buttons = [(QuickInputButtons.Back)];
                    disposables.push(
                        pickBox.onDidTriggerButton((item) => {
                            if (item === QuickInputButtons.Back) {
                                resolve(false);
                            }
                        }),
                        pickBox.onDidAccept(() => {
                            projectMetadata.javaVersion = pickBox.selectedItems[0].label;
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

export const specifyJavaVersionStep: SpecifyJavaVersionStep = new SpecifyJavaVersionStep(specifyLanguageStep, specifyGroupIdStep);
