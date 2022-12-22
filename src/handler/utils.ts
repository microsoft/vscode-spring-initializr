// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Disposable, InputBox, QuickInputButtons, QuickPick, window } from "vscode";
import { OperationCanceledError } from "../Errors";
import { Identifiable } from "../model/Metadata";
import { artifactIdValidation, groupIdValidation } from "../Utils";
import { IHandlerItem, IInputMetaData, IPickMetadata, IProjectMetadata } from "./HandlerInterfaces";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { SpecifyBootVersionStep } from "./SpecifyBootVersionStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { SpecifyJavaVersionStep } from "./SpecifyJavaVersionStep";
import { SpecifyLanguageStep } from "./SpecifyLanguageStep";
import { SpecifyPackagingStep } from "./SpecifyPackagingStep";
import { SpecifyServiceUrlStep } from "./SpecifyServiceUrlStep";

const DEFAULT_SERVICE_URL: string = "https://start.spring.io";

export async function specifyServiceUrl(projectMetadata?: IProjectMetadata): Promise<string> {
    const configValue = vscode.workspace.getConfiguration("spring.initializr").get<string | string[]>("serviceUrl");
    if (typeof configValue === "string") {
        return configValue;
    } else if (typeof configValue === "object" && configValue instanceof Array && configValue.length > 0) {
        if (configValue.length === 1) {
            return configValue[0];
        }
        if (projectMetadata !== undefined) {
            projectMetadata.pickSteps.push(SpecifyServiceUrlStep.getInstance());
        }
        return await vscode.window.showQuickPick(configValue, { ignoreFocusOut: true, placeHolder: "Select the service URL." });
    } else {
        return DEFAULT_SERVICE_URL;
    }
}

export async function createPickBox<T extends Identifiable>(pickMetadata: IPickMetadata<T>): Promise<boolean> {
    const disposables: Disposable[] = [];

    const resultPromise = new Promise<boolean>(async (resolve, reject) => {
        const pickBox: QuickPick<IHandlerItem<T>> = window.createQuickPick<IHandlerItem<T>>();
        pickBox.title = pickMetadata.title;
        pickBox.placeholder = pickMetadata.placeholder;
        pickBox.ignoreFocusOut = true;
        pickBox.busy = true;
        pickBox.show();
        try {
            pickBox.items = await pickMetadata.items;
            pickBox.busy = false;
        } catch (error) {
            pickBox.hide();
            return reject(error);
        }
        if (pickMetadata.metadata.pickSteps.length > 0) {
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
                if (!pickBox.selectedItems?.[0]) {
                    return;
                }
                if (pickMetadata.pickStep instanceof SpecifyLanguageStep) {
                    pickMetadata.metadata.language = pickBox.selectedItems[0].label?.toLowerCase();
                } else if (pickMetadata.pickStep instanceof SpecifyJavaVersionStep) {
                    pickMetadata.metadata.javaVersion = pickBox.selectedItems[0].value?.id;
                } else if (pickMetadata.pickStep instanceof SpecifyPackagingStep) {
                    pickMetadata.metadata.packaging = pickBox.selectedItems[0].label?.toLowerCase();
                } else if (pickMetadata.pickStep instanceof SpecifyBootVersionStep) {
                    pickMetadata.metadata.bootVersion = pickBox.selectedItems[0].value?.id;
                }
                pickMetadata.metadata.pickSteps.push(pickMetadata.pickStep);
                return resolve(true);
            }),
            pickBox.onDidHide(() => {
                if (pickMetadata.pickStep instanceof SpecifyLanguageStep) {
                    return reject(new OperationCanceledError("Language not specified."));
                } else if (pickMetadata.pickStep instanceof SpecifyJavaVersionStep) {
                    return reject(new OperationCanceledError("Java version not specified."));
                } else if (pickMetadata.pickStep instanceof SpecifyPackagingStep) {
                    return reject(new OperationCanceledError("Packaging not specified."));
                } else if (pickMetadata.pickStep instanceof SpecifyBootVersionStep) {
                    return reject(new OperationCanceledError("BootVersion not specified."));
                }
                return reject(new Error("Unknown picking step"));
            })
        );
        disposables.push(pickBox);
        pickBox.show();
    });

    try {
        return await resultPromise;
    } catch (error) {
        throw error;
    } finally {
        for (const d of disposables) {
            d.dispose();
        }
    }

}

export async function createInputBox(inputMetaData: IInputMetaData): Promise<boolean> {
    const disposables: Disposable[] = [];
    const result: boolean = await new Promise<boolean>((resolve, reject) => {
        const inputBox: InputBox = window.createInputBox();
        inputBox.title = inputMetaData.title;
        inputBox.placeholder = inputMetaData.placeholder;
        inputBox.prompt = inputMetaData.prompt;
        inputBox.value = inputMetaData.defaultValue;
        inputBox.ignoreFocusOut = true;
        if (inputMetaData.metadata.pickSteps.length > 0) {
            inputBox.buttons = [(QuickInputButtons.Back)];
            disposables.push(
                inputBox.onDidTriggerButton((item) => {
                    if (item === QuickInputButtons.Back) {
                        return resolve(false);
                    }
                })
            );
        }
        disposables.push(
            inputBox.onDidChangeValue(() => {
                let validCheck: string | undefined;
                if (inputMetaData.pickStep instanceof SpecifyGroupIdStep) {
                    validCheck = groupIdValidation(inputBox.value);
                } else if (inputMetaData.pickStep instanceof SpecifyArtifactIdStep) {
                    validCheck = artifactIdValidation(inputBox.value);
                }
                inputBox.validationMessage = validCheck;
            }),
            inputBox.onDidAccept(() => {
                if (inputBox.validationMessage) {
                    return;
                }
                if (inputMetaData.pickStep instanceof SpecifyGroupIdStep) {
                    inputMetaData.metadata.groupId = inputBox.value;
                    SpecifyGroupIdStep.getInstance().setDefaultInput(inputBox.value);
                    inputMetaData.metadata.pickSteps.push(SpecifyGroupIdStep.getInstance());
                } else if (inputMetaData.pickStep instanceof SpecifyArtifactIdStep) {
                    inputMetaData.metadata.artifactId = inputBox.value;
                    SpecifyArtifactIdStep.getInstance().setDefaultInput(inputBox.value);
                    inputMetaData.metadata.pickSteps.push(SpecifyArtifactIdStep.getInstance());
                }
                return resolve(true);
            }),
            inputBox.onDidHide(() => {
                if (inputMetaData.pickStep instanceof SpecifyGroupIdStep) {
                    return reject(new OperationCanceledError("GroupId not specified."));
                } else if (inputMetaData.pickStep instanceof SpecifyArtifactIdStep) {
                    return reject(new OperationCanceledError("ArtifactId not specified."));
                }
                return reject(new Error("Unknown inputting step"));
            })
        );
        disposables.push(inputBox);
        inputBox.show();
    });
    for (const d of disposables) {
        d.dispose();
    }
    return result;
}
