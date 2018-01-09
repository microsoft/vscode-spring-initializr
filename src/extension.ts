// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as unzip from "unzip";
import * as vscode from "vscode";
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
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
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType}`, () => {
                return async () => await generateProjectRoutine(projectType);
            })
        );
    });
}

async function generateProjectRoutine(projectType: string): Promise<void> {
    const groupId: string = await VSCodeUI.getFromInputBox({ prompt: STEP1_MESSAGE, placeHolder: "e.g. com.example" });
    if (groupId === undefined) { return; }
    const artifactId: string = await VSCodeUI.getFromInputBox({ prompt: STEP2_MESSAGE, placeHolder: "e.g. demo" });
    if (artifactId === undefined) { return; }
    let current: IDependencyQuickPickItem = null;
    const manager: DependencyManager = new DependencyManager();

    do {
        current = await vscode.window.showQuickPick(
            manager.getQuickPickItems(), { ignoreFocusOut: true, placeHolder: STEP3_MESSAGE }
        );
        if (current && current.itemType === "dependency") {
            manager.toggleDependency(current.id);
        }
    } while (current && current.itemType !== "command");
    if (current) {
        // Choose target folder
        const outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: "Generate into this folder" });
        if (!outputUri) { return; }
        // Download & Unzip
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
            async (resolve: () => void, _reject: (e: Error) => void): Promise<void> => {
                p.report({ message: "Downloading zip package..." });
                const targetUrl: string = `https://start.spring.io/starter.zip?type=${projectType}-project&groupId=${groupId}&artifactId=${artifactId}&style=${current.id}`;
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

        //Open in new window
        const choice: string = await vscode.window.showInformationMessage(`Successfully generated. Location: ${outputUri.fsPath}`, "Open it");
        if (choice === "Open it") {
            const hasOpenFolder: boolean = (vscode.workspace.workspaceFolders !== undefined);
            vscode.commands.executeCommand("vscode.openFolder", outputUri, hasOpenFolder);
        }
    }
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
