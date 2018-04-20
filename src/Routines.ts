// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as unzip from "unzip-stream";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { IBom, IMavenId, IRepository, IStarters, IValue } from "./Interfaces";
import * as Metadata from "./Metadata";
import { BomNode } from "./pomxml/BomNode";
import { DependencyNode } from "./pomxml/DependencyNode";
import { addBomNode, addDependencyNode, addRepositoryNode, removeDependencyNode } from "./pomxml/PomXml";
import { RepositoryNode } from "./pomxml/RepositoryNode";
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
                Metadata.getBootVersions(),
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
                    manager.getQuickPickItems(bootVersion.id, { hasLastSelected: true }), { ignoreFocusOut: true, placeHolder: STEP4_MESSAGE, matchOnDetail: true, matchOnDescription: true }
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
                    const targetUrl: string = `${Utils.settings.getServiceUrl()}/starter.zip?type=${projectType}&groupId=${groupId}&artifactId=${artifactId}&bootVersion=${bootVersion.id}&dependencies=${current.id}`;
                    const filepath: string = await Utils.downloadFile(targetUrl);

                    p.report({ message: "Starting to unzip..." });
                    fse.createReadStream(filepath).pipe(unzip.Extract({ path: outputUri.fsPath })).on("close", () => {
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
        export async function run(entry: vscode.Uri): Promise<void> {
            let bootVersion: string;
            const deps: string[] = []; // gid:aid
            // Read pom.xml for $bootVersion, $dependencies(gid, aid)
            const content: Buffer = await fse.readFile(entry.fsPath);
            const xml: any = await Utils.readXmlContent(content.toString());
            const parentNode: any = xml.project.parent;

            if (parentNode[0].artifactId[0] === "spring-boot-starter-parent" && parentNode[0].groupId[0] === "org.springframework.boot") {
                bootVersion = parentNode[0].version[0];
            }

            xml.project.dependencies[0].dependency.forEach(elem => {
                deps.push(`${elem.groupId[0]}:${elem.artifactId[0]}`);
            });

            // [interaction] Step: Dependencies, with pre-selected deps
            const starters: IStarters = await Metadata.dependencies.getStarters(bootVersion);
            const oldStarterIds: string[] = [];
            Object.keys(starters.dependencies).forEach(key => {
                const elem: IMavenId = starters.dependencies[key];
                if (deps.indexOf(`${elem.groupId}:${elem.artifactId}`) >= 0) {
                    oldStarterIds.push(key);
                }
            });
            const manager: DependencyManager = new DependencyManager();

            manager.selectedIds = [].concat(oldStarterIds);
            let current: IDependencyQuickPickItem = null;
            do {
                current = await vscode.window.showQuickPick(
                    manager.getQuickPickItems(bootVersion), { ignoreFocusOut: true, placeHolder: "Select dependencies.", matchOnDetail: true, matchOnDescription: true }
                );
                if (current && current.itemType === "dependency") {
                    manager.toggleDependency(current.id);
                }
            } while (current && current.itemType === "dependency");
            if (!current) { return; }

            // Diff deps for add/remove
            const toRemove: string[] = oldStarterIds.filter(elem => manager.selectedIds.indexOf(elem) < 0);
            const toAdd: string[] = manager.selectedIds.filter(elem => oldStarterIds.indexOf(elem) < 0);
            if (toRemove.length + toAdd.length === 0) {
                vscode.window.showInformationMessage("No changes.");
                return;
            }
            const choice: string = await vscode.window.showWarningMessage(`[EditStarters] Remove: [${toRemove.join(", ")}]. Add: [${toAdd.join(", ")}]. Proceed?`, "Proceed", "Cancel");
            if (choice !== "Proceed") {
                return;
            }
            // modify xml object
            const newXml: any = Object.assign({}, xml);
            toRemove.forEach(elem => {
                removeDependencyNode(newXml, starters.dependencies[elem].groupId, starters.dependencies[elem].artifactId);
            });
            toAdd.forEach(elem => {
                const dep: IMavenId = starters.dependencies[elem];
                const newDepNode: DependencyNode = new DependencyNode(dep.groupId, dep.artifactId, dep.version, dep.scope);

                addDependencyNode(newXml, newDepNode.node);

                if (dep.bom) {
                    const bom: IBom = starters.boms[dep.bom];
                    const newBomNode: BomNode = new BomNode(bom.groupId, bom.artifactId, bom.version);
                    addBomNode(newXml, newBomNode.node);
                }

                if (dep.repository) {
                    const repo: IRepository = starters.repositories[dep.repository];
                    const newRepoNode: RepositoryNode = new RepositoryNode(dep.repository, repo.name, repo.url, repo.snapshotEnabled);
                    addRepositoryNode(newXml, newRepoNode.node);
                }

            });

            // re-generate a pom.xml
            const output: string = Utils.buildXmlContent(newXml);
            await fse.writeFile(entry.fsPath, output);
            return;
        }
    }
}
