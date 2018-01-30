// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as unzip from "unzip";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { Metadata } from "./Metadata";
import { IValue } from "./Model";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

const STEP1_MESSAGE: string = "Input Group Id for your project. (Step 1/3)\t";
const STEP2_MESSAGE: string = "Input Artifact Id for your project. (Step 2/3)\t";
const STEP3_MESSAGE: string = "Search for dependencies. (Step 3/3)";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ["maven-project", "gradle-project"].forEach((projectType: string) => {
        context.subscriptions.push(
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType}`, (t: Session) => {
                return async () => await generateProjectRoutine(projectType, t);
            })
        );
    });
}

async function generateProjectRoutine(projectType: string, session?: Session): Promise<void> {
    session.extraProperties.finishedSteps = [];
    const metadata: Metadata = new Metadata(vscode.workspace.getConfiguration("spring.initializr").get<string>("serviceUrl"));

    // Step: Group Id
    const defaultGroupId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
    const groupId: string = await VSCodeUI.getFromInputBox({
        prompt: STEP1_MESSAGE,
        placeHolder: "e.g. com.example",
        value: defaultGroupId,
        validateInput: groupIdValidation
    });
    if (groupId === undefined) { return; }
    session.extraProperties.finishedSteps.push("GroupId");
    session.info("GroupId inputed.");
    // Step: Artifact Id
    const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
    const artifactId: string = await VSCodeUI.getFromInputBox({
        prompt: STEP2_MESSAGE,
        placeHolder: "e.g. demo",
        value: defaultArtifactId,
        validateInput: artifactIdValidation
    });
    if (artifactId === undefined) { return; }
    session.extraProperties.finishedSteps.push("ArtifactId");
    session.info("ArtifactId inputed.");
    // Step: bootVersion
    const bootVersion: IValue = await VSCodeUI.getQuickPick<IValue>(
        metadata.getBootVersion(),
        version => version.name,
        version => version.description,
        null
    );
    session.extraProperties.finishedSteps.push("BootVersion");
    session.info("BootVersion selected.");
    // Step: Dependencies
    let current: IDependencyQuickPickItem = null;
    const manager: DependencyManager = new DependencyManager();
    do {
        current = await vscode.window.showQuickPick(
            manager.getQuickPickItems(metadata, bootVersion.id), { ignoreFocusOut: true, placeHolder: STEP3_MESSAGE, matchOnDetail: true, matchOnDescription: true }
        );
        if (current && current.itemType === "dependency") {
            manager.toggleDependency(current.id);
        }
    } while (current && current.itemType === "dependency");
    if (!current) { return; }
    session.extraProperties.finishedSteps.push("Dependencies");
    session.info("Dependencies selected.");
    session.extraProperties.depsType = current.itemType;
    session.extraProperties.dependencies = current.id;
    // Step: Choose target folder
    const outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: "Generate into this folder" });
    if (!outputUri) { return; }
    session.extraProperties.finishedSteps.push("TargetFolder");
    session.info("Target folder selected.");

    // Step: Download & Unzip
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
        async (resolve: () => void, _reject: (e: Error) => void): Promise<void> => {
            p.report({ message: "Downloading zip package..." });
            const targetUrl: string = `${metadata.serviceUrl}/starter.zip?type=${projectType}&groupId=${groupId}&artifactId=${artifactId}&bootVersion=${bootVersion.id}&dependencies=${current.id}`;
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
    session.extraProperties.finishedSteps.push("DownloadUnzip");
    session.info("Package unzipped.");
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

function groupIdValidation(value: string): string {
    return (/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(value)) ? null : "Invalid Group Id";
}

function artifactIdValidation(value: string): string {
    return (/^[a-z_][a-z0-9_]*(-[a-z_][a-z0-9_]*)*$/.test(value)) ? null : "Invalid Artifact Id";
}
