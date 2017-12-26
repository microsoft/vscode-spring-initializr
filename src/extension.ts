"use strict";
import * as fs from "fs";
import * as unzip from "unzip";
import * as vscode from "vscode";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export function activate(context: vscode.ExtensionContext): void {

    const STEP1_MESSAGE: string = "Input Group Id for your project. (Step 1/3)\t";
    const STEP2_MESSAGE: string = "Input Artifact Id for your project. (Step 2/3)\t";
    const STEP3_MESSAGE: string = "Search for dependencies. (Step 3/3)";

    context.subscriptions.push(vscode.commands.registerCommand("spring.initializr.generate", async () => {
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
                    const targetUrl: string = `https://start.spring.io/starter.zip?groupId=${groupId}&artifactId=${artifactId}&style=${current.id}`;
                    const filepath: string = await Utils.downloadFile(targetUrl);

                    p.report({ message: "Starting to unzip..." });
                    fs.createReadStream(filepath).pipe(unzip.Extract({ path: outputUri.fsPath })).on("close", () => {
                        DependencyManager.UPDATE_LAST_USED_DEPENDENCIES(current);
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
                vscode.commands.executeCommand("vscode.openFolder", outputUri, true);
            }
        }
    }));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
