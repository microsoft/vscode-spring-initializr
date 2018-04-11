// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as fs from "fs";
import * as unzip from "unzip-stream";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { Metadata } from "./Metadata";
import { IValue } from "./Model";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

class Step {
    public readonly name: string;
    public readonly info: string;
    constructor(name: string, info: string) {
        this.name = name;
        this.info = info;
    }
}
const stepGroupId: Step = new Step("GroupId", "GroupId inputed.");
const stepArtifactId: Step = new Step("ArtifactId", "ArtifactId inputed.");
const stepBootVersion: Step = new Step("BootVersion", "BootVersion selected.");
const stepDependencies: Step = new Step("Dependencies", "Dependencies selected.");
const stepTargetFolder: Step = new Step("TargetFolder", "Target folder selected.");
const stepDownloadUnzip: Step = new Step("DownloadUnzip", "Package unzipped.");

const STEP1_MESSAGE: string = "Input Group Id for your project. (Step 1/4)\t";
const STEP2_MESSAGE: string = "Input Artifact Id for your project. (Step 2/4)\t";
const STEP3_MESSAGE: string = "Specify Spring Boot version. (Step 3/4)";
const STEP4_MESSAGE: string = "Search for dependencies. (Step 4/4)";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ["maven-project", "gradle-project"].forEach((projectType: string) => {
        context.subscriptions.push(
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType}`, async () => await generateProjectRoutine(projectType))
        );
    });
}

async function generateProjectRoutine(projectType: string): Promise<void> {
    const session: Session = TelemetryWrapper.currentSession();
    if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }
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
    finishStep(stepGroupId);

    // Step: Artifact Id
    const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
    const artifactId: string = await VSCodeUI.getFromInputBox({
        prompt: STEP2_MESSAGE,
        placeHolder: "e.g. demo",
        value: defaultArtifactId,
        validateInput: artifactIdValidation
    });
    if (artifactId === undefined) { return; }
    finishStep(stepArtifactId);

    // Step: bootVersion
    const bootVersion: IValue = await VSCodeUI.getQuickPick<IValue>(
        metadata.getBootVersion(),
        version => version.name,
        version => version.description,
        null,
        { placeHolder: STEP3_MESSAGE }
    );
    if (bootVersion === undefined) { return; }
    finishStep(stepBootVersion);

    // Step: Dependencies
    let current: IDependencyQuickPickItem = null;
    const manager: DependencyManager = new DependencyManager();
    do {
        current = await vscode.window.showQuickPick(
            manager.getQuickPickItems(metadata, bootVersion.id), { ignoreFocusOut: true, placeHolder: STEP4_MESSAGE, matchOnDetail: true, matchOnDescription: true }
        );
        if (current && current.itemType === "dependency") {
            manager.toggleDependency(current.id);
        }
    } while (current && current.itemType === "dependency");
    if (!current) { return; }
    if (session && session.extraProperties) {
        session.extraProperties.depsType = current.itemType;
        session.extraProperties.dependencies = current.id;
    }
    finishStep(stepDependencies);

    // Step: Choose target folder
    const outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: "Generate into this folder" });
    if (!outputUri) { return; }
    finishStep(stepTargetFolder);

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
    finishStep(stepDownloadUnzip);

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

function finishStep(step: Step): void {
    const session: Session = TelemetryWrapper.currentSession();
    if (session && session.extraProperties) { session.extraProperties.finishedSteps.push(step.name); }
    TelemetryWrapper.info(step.info);
}
