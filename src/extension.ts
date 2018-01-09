// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as unzip from "unzip";
import * as vscode from "vscode";
import { TelemetryWrapper, Transaction } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

const STEP1_MESSAGE: string = "Input Group Id for your project. (Step 1/3)\t";
const STEP2_MESSAGE: string = "Input Artifact Id for your project. (Step 2/3)\t";
const STEP3_MESSAGE: string = "Search for dependencies. (Step 3/3)";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ["maven", "gradle"].forEach((projectType: string) => {
        context.subscriptions.push(
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType}`, (t: Transaction) => {
                return async () => await generateProjectRoutine(projectType, t);
            })
        );
    });
}

async function generateProjectRoutine(projectType: string, transaction?: Transaction): Promise<void> {
    transaction.customProperties.finishedSteps = [];
    // Step: Group Id
    const groupId: string = await VSCodeUI.getFromInputBox({ prompt: STEP1_MESSAGE, placeHolder: "e.g. com.example", validateInput: groupIdValidation });
    if (groupId === undefined) { return; }
    transaction.customProperties.finishedSteps.push("GroupId");

    // Step: Artifact Id
    const artifactId: string = await VSCodeUI.getFromInputBox({ prompt: STEP2_MESSAGE, placeHolder: "e.g. demo", validateInput: artifactIdValidation });
    if (artifactId === undefined) { return; }
    transaction.customProperties.finishedSteps.push("ArtifactId");

    // Step: Dependencies
    let current: IDependencyQuickPickItem = null;
    const manager: DependencyManager = new DependencyManager();
    do {
        current = await vscode.window.showQuickPick(
            manager.getQuickPickItems(), { ignoreFocusOut: true, placeHolder: STEP3_MESSAGE }
        );
        if (current && current.itemType === "dependency") {
            manager.toggleDependency(current.id);
        }
    } while (current && current.itemType === "dependency");
    if (!current) { return; }
    transaction.customProperties.finishedSteps.push("Dependencies");
    transaction.customProperties.depsType = current.itemType;
    transaction.customProperties.dependencies = current.id;

    // Step: Choose target folder
    const outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: "Generate into this folder" });
    if (!outputUri) { return; }
    transaction.customProperties.finishedSteps.push("TargetFolder");

    // Step: Download & Unzip
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
        async (resolve: () => void, _reject: (e: Error) => void): Promise<void> => {
            p.report({ message: "Downloading zip package..." });
            let targetUrl: string = `https://start.spring.io/starter.zip?type=${projectType}-project&style=${current.id}`;
            if (groupId) {
                targetUrl += `&groupId=${groupId}`;
            }
            if (artifactId) {
                targetUrl += `&artifactId=${artifactId}`;
            }
            const filepath: string = await Utils.downloadFile(targetUrl);

            p.report({ message: "Starting to unzip..." });
            fs.createReadStream(filepath).pipe(unzip.Extract({ path: outputUri.fsPath })).on("close", () => {
                manager.updateLastUsedDependencies(current);
                resolve();
            }).on("error", (err: Error) => {
                vscode.window.showErrorMessage(err.message);
                resolve();
            });
        }
    ));
    transaction.customProperties.finishedSteps.push("DownloadUnzip");
    //Open in new window
    const choice: string = await vscode.window.showInformationMessage(`Successfully generated. Location: ${outputUri.fsPath}`, "Open it");
    if (choice === "Open it") {
        const hasOpenFolder: boolean = (vscode.workspace.workspaceFolders !== undefined);
        vscode.commands.executeCommand("vscode.openFolder", outputUri, hasOpenFolder);
    }
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}

function groupIdValidation(_value: string): string {
    return null;
}

function artifactIdValidation(_value: string): string {
    return null;
}
