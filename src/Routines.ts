// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as unzip from "unzip-stream";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { Metadata } from "./Metadata";
import { IValue } from "./Model";
import { TelemetryHelper } from "./TelemetryHelper";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export module Routines {
    export namespace GenerateProject {
        const STEP1_MESSAGE: string = "Input Group Id for your project. (Step 1/4)\t";
        const STEP2_MESSAGE: string = "Input Artifact Id for your project. (Step 2/4)\t";
        const STEP3_MESSAGE: string = "Specify Spring Boot version. (Step 3/4)";
        const STEP4_MESSAGE: string = "Search for dependencies. (Step 4/4)";

        const stepGroupId: TelemetryHelper.IStep = { name: "GroupId", info: "GroupId inputed." };
        const stepArtifactId: TelemetryHelper.IStep = { name: "ArtifactId", info: "ArtifactId inputed." };
        const stepBootVersion: TelemetryHelper.IStep = { name: "BootVersion", info: "BootVersion selected." };
        const stepDependencies: TelemetryHelper.IStep = { name: "Dependencies", info: "Dependencies selected." };
        const stepTargetFolder: TelemetryHelper.IStep = { name: "TargetFolder", info: "Target folder selected." };
        const stepDownloadUnzip: TelemetryHelper.IStep = { name: "DownloadUnzip", info: "Package unzipped." };

        export async function run(projectType: string): Promise<void> {
            const session: Session = TelemetryWrapper.currentSession();
            if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }
            const metadata: Metadata = new Metadata(vscode.workspace.getConfiguration("spring.initializr").get<string>("serviceUrl"));

            // Step: Group Id
            const defaultGroupId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
            const groupId: string = await VSCodeUI.getFromInputBox({
                prompt: STEP1_MESSAGE,
                placeHolder: "e.g. com.example",
                value: defaultGroupId,
                validateInput: Utils.groupIdValidation
            });
            if (groupId === undefined) { return; }
            TelemetryHelper.finishStep(stepGroupId);

            // Step: Artifact Id
            const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
            const artifactId: string = await VSCodeUI.getFromInputBox({
                prompt: STEP2_MESSAGE,
                placeHolder: "e.g. demo",
                value: defaultArtifactId,
                validateInput: Utils.artifactIdValidation
            });
            if (artifactId === undefined) { return; }
            TelemetryHelper.finishStep(stepArtifactId);

            // Step: bootVersion
            const bootVersion: IValue = await VSCodeUI.getQuickPick<IValue>(
                metadata.getBootVersion(),
                version => version.name,
                version => version.description,
                null,
                { placeHolder: STEP3_MESSAGE }
            );
            if (bootVersion === undefined) { return; }
            TelemetryHelper.finishStep(stepBootVersion);

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
            TelemetryHelper.finishStep(stepDependencies);

            // Step: Choose target folder
            const outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: "Generate into this folder" });
            if (!outputUri) { return; }
            TelemetryHelper.finishStep(stepTargetFolder);

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
            TelemetryHelper.finishStep(stepDownloadUnzip);

            //Open in new window
            const choice: string = await vscode.window.showInformationMessage(`Successfully generated. Location: ${outputUri.fsPath}`, "Open it");
            if (choice === "Open it") {
                const hasOpenFolder: boolean = (vscode.workspace.workspaceFolders !== undefined);
                vscode.commands.executeCommand("vscode.openFolder", outputUri, hasOpenFolder);
            }
        }
    }

    export namespace EditStarters {
        export async function run(projectType: string): Promise<void> {
            if (projectType !== "maven-project") {
                return;
            }
            // Read pom.xml for $bootVersion, $dependencies(gid, aid)
            // [interaction] Step: Dependencies, with pre-selected deps
            // Diff deps for add/remove
            // re-generate a pom.xml
            return;
        }
    }
}
