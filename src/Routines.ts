// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependencyQuickPickItem } from "./DependencyManager";
import { IBom, IMavenId, IRepository, IStarters, IValue, XmlNode } from "./Interfaces";
import * as Metadata from "./Metadata";
import { BomNode } from "./pomxml/BomNode";
import { DependencyNode } from "./pomxml/DependencyNode";
import { addBomNode, addDependencyNode, addRepositoryNode, getBootVersion, getDependencyNodes, removeDependencyNode } from "./pomxml/PomXml";
import { RepositoryNode } from "./pomxml/RepositoryNode";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export module Routines {
    interface IStep {
        name: string;
        info: string;
    }

    function finishStep(session: Session, step: IStep): void {
        if (session && session.extraProperties) { session.extraProperties.finishedSteps.push(step.name); }
        TelemetryWrapper.info(step.info);
    }

    export namespace GenerateProject {
        const STEP_LANGUAGE_MESSAGE: string = "Specify project language.";
        const STEP_PACKAGING_MESSAGE: string = "Specify packaging type.";
        const STEP_GROUPID_MESSAGE: string = "Input Group Id for your project.";
        const STEP_ARTIFACTID_MESSAGE: string = "Input Artifact Id for your project.";
        const STEP_BOOTVERSION_MESSAGE: string = "Specify Spring Boot version.";
        const STEP_DEPENDENCY_MESSAGE: string = "Search for dependencies.";

        const stepLanguage: IStep = { name: "Language", info: "Language selected." };
        const stepGroupId: IStep = { name: "GroupId", info: "GroupId inputed." };
        const stepArtifactId: IStep = { name: "ArtifactId", info: "ArtifactId inputed." };
        const stepBootVersion: IStep = { name: "BootVersion", info: "BootVersion selected." };
        const stepDependencies: IStep = { name: "Dependencies", info: "Dependencies selected." };
        const stepTargetFolder: IStep = { name: "TargetFolder", info: "Target folder selected." };
        const stepDownloadUnzip: IStep = { name: "DownloadUnzip", info: "Package unzipped." };

        async function specifyLanguage(): Promise<string> {
            let language: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
            if (!language) {
                language = await vscode.window.showQuickPick(
                    ["Java", "Kotlin", "Groovy"],
                    { ignoreFocusOut: true, placeHolder: STEP_LANGUAGE_MESSAGE }
                );
            }
            return language && language.toLowerCase();
        }

        async function specifyGroupId(): Promise<string> {
            const defaultGroupId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
            return await VSCodeUI.getFromInputBox({
                prompt: STEP_GROUPID_MESSAGE,
                placeHolder: "e.g. com.example",
                value: defaultGroupId,
                validateInput: Utils.groupIdValidation
            });
        }

        async function specifyArtifactId(): Promise<string> {
            const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
            return await VSCodeUI.getFromInputBox({
                prompt: STEP_ARTIFACTID_MESSAGE,
                placeHolder: "e.g. demo",
                value: defaultArtifactId,
                validateInput: Utils.artifactIdValidation
            });
        }

        async function specifyPackaging(): Promise<string> {
            let packaging: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultPackaging");
            if (!packaging) {
                packaging = await vscode.window.showQuickPick(
                    ["JAR", "WAR"],
                    { ignoreFocusOut: true, placeHolder: STEP_PACKAGING_MESSAGE }
                );
            }
            return packaging && packaging.toLowerCase();
        }

        async function specifyBootVersion(): Promise<string> {
            const bootVersion: IValue = await VSCodeUI.getQuickPick<IValue>(
                Metadata.getBootVersions(),
                version => version.name,
                version => version.description,
                null,
                { placeHolder: STEP_BOOTVERSION_MESSAGE }
            );
            return bootVersion && bootVersion.id;
        }

        async function specifyTargetFolder(projectName: string): Promise<vscode.Uri> {
            const OPTION_CONTINUE: string = "Continue";
            const OPTION_CHOOSE_ANOTHER_FOLDER: string = "Choose another folder";
            const LABEL_CHOOSE_FOLDER: string = "Generate into this folder";
            const MESSAGE_EXISTING_FOLDER: string = `A folder [${projectName}] is already existing in the selected folder. Continue to overwrite or Choose another folder?`;

            let outputUri: vscode.Uri = await VSCodeUI.openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
            while (outputUri && await (fse.pathExists(path.join(outputUri.fsPath, projectName)))) {
                const overrideChoice: String = await vscode.window.showWarningMessage(MESSAGE_EXISTING_FOLDER, OPTION_CONTINUE, OPTION_CHOOSE_ANOTHER_FOLDER);
                if (overrideChoice === OPTION_CHOOSE_ANOTHER_FOLDER) {
                    outputUri = await VSCodeUI.openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
                } else {
                    break;
                }
            }
            return outputUri;
        }

        export async function run(projectType: string): Promise<void> {
            const session: Session = TelemetryWrapper.currentSession();
            if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }

            // Step: language
            const language: string = await specifyLanguage();
            if (language === undefined) { return; }
            finishStep(session, stepLanguage);

            // Step: Group Id
            const groupId: string = await specifyGroupId();
            if (groupId === undefined) { return; }
            finishStep(session, stepGroupId);

            // Step: Artifact Id
            const artifactId: string = await specifyArtifactId();
            if (artifactId === undefined) { return; }
            finishStep(session, stepArtifactId);

            // Step: Packaging
            const packaging: string = await specifyPackaging();
            if (packaging === undefined) { return; }

            // Step: bootVersion
            const bootVersion: string = await specifyBootVersion();
            if (bootVersion === undefined) { return; }
            finishStep(session, stepBootVersion);

            // Step: Dependencies
            let current: IDependencyQuickPickItem = null;
            const manager: DependencyManager = new DependencyManager();
            do {
                current = await vscode.window.showQuickPick(
                    manager.getQuickPickItems(bootVersion, { hasLastSelected: true }), { ignoreFocusOut: true, placeHolder: STEP_DEPENDENCY_MESSAGE, matchOnDetail: true, matchOnDescription: true }
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
            finishStep(session, stepDependencies);

            // Step: Choose target folder
            const outputUri: vscode.Uri = await specifyTargetFolder(artifactId);
            if (outputUri === undefined) { return; }
            finishStep(session, stepTargetFolder);

            // Step: Download & Unzip
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
                async (resolve: () => void, _reject: (e: Error) => void): Promise<void> => {
                    p.report({ message: "Downloading zip package..." });
                    const params: string[] = [
                        `type=${projectType}`,
                        `language=${language}`,
                        `groupId=${groupId}`,
                        `artifactId=${artifactId}`,
                        `packaging=${packaging}`,
                        `bootVersion=${bootVersion}`,
                        `baseDir=${artifactId}`,
                        `dependencies=${current.id}`
                    ];
                    const targetUrl: string = `${Utils.settings.getServiceUrl()}/starter.zip?${params.join("&")}`;
                    const filepath: string = await Utils.downloadFile(targetUrl);

                    p.report({ message: "Starting to unzip..." });
                    extract(filepath, { dir: outputUri.fsPath }, (err) => {
                        if (err) {
                            vscode.window.showErrorMessage(err.message);
                        } else {
                            manager.updateLastUsedDependencies(current);
                        }
                        resolve();
                    });
                }
            ));
            finishStep(session, stepDownloadUnzip);

            //Open in new window
            const choice: string = await vscode.window.showInformationMessage(`Successfully generated. Location: ${outputUri.fsPath}`, "Open it");
            if (choice === "Open it") {
                const hasOpenFolder: boolean = (vscode.workspace.workspaceFolders !== undefined);
                vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path.join(outputUri.fsPath, artifactId)), hasOpenFolder);
            }
        }
    }

    export namespace EditStarters {
        const stepBootVersion: IStep = { name: "BootVersion", info: "BootVersion identified." };
        const stepDependencies: IStep = { name: "Dependencies", info: "Dependencies selected." };
        const stepCancel: IStep = { name: "Cancel", info: "Canceled by user." };
        const stepProceed: IStep = { name: "Proceed", info: "Confirmed by user." };
        const stepWriteFile: IStep = { name: "WriteFile", info: "Pom file updated." };

        export async function run(entry: vscode.Uri): Promise<void> {
            const session: Session = TelemetryWrapper.currentSession();
            if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }
            const deps: string[] = []; // gid:aid

            // Read pom.xml for $bootVersion, $dependencies(gid, aid)
            const content: Buffer = await fse.readFile(entry.fsPath);
            const xml: { project: XmlNode } = await Utils.readXmlContent(content.toString());

            const bootVersion: string = getBootVersion(xml.project);
            if (!bootVersion) {
                vscode.window.showErrorMessage("Not a valid Spring Boot project.");
                return;
            }
            if (session && session.extraProperties) {
                session.extraProperties.bootVersion = bootVersion;
            }

            getDependencyNodes(xml.project).forEach(elem => {
                deps.push(`${elem.groupId[0]}:${elem.artifactId[0]}`);
            });
            finishStep(session, stepBootVersion);

            // [interaction] Step: Dependencies, with pre-selected deps
            const starters: IStarters = await vscode.window.withProgress<IStarters>({ location: vscode.ProgressLocation.Window }, async (p) => {
                p.report({ message: `Fetching metadata for version ${bootVersion} ...` });
                return await Metadata.dependencies.getStarters(bootVersion);
            });

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
            if (session && session.extraProperties) {
                session.extraProperties.dependencies = current.id;
            }
            finishStep(session, stepDependencies);

            // Diff deps for add/remove
            const toRemove: string[] = oldStarterIds.filter(elem => manager.selectedIds.indexOf(elem) < 0);
            const toAdd: string[] = manager.selectedIds.filter(elem => oldStarterIds.indexOf(elem) < 0);
            if (toRemove.length + toAdd.length === 0) {
                vscode.window.showInformationMessage("No changes.");
                return;
            }
            const msgRemove: string = (toRemove && toRemove.length) ? `Removing: [${toRemove.map(d => manager.dict[d] && manager.dict[d].name).filter(Boolean).join(", ")}].` : "";
            const msgAdd: string = (toAdd && toAdd.length) ? `Adding: [${toAdd.map(d => manager.dict[d] && manager.dict[d].name).filter(Boolean).join(", ")}].` : "";
            const choice: string = await vscode.window.showWarningMessage(`${msgRemove} ${msgAdd} Proceed?`, "Proceed", "Cancel");
            if (choice !== "Proceed") {
                finishStep(session, stepCancel);
                return;
            } else {
                finishStep(session, stepProceed);
            }

            // add spring-boot-starter if no selected starters
            if (manager.selectedIds.length === 0) {
                toAdd.push("spring-boot-starter");
                starters.dependencies["spring-boot-starter"] = {
                    groupId: "org.springframework.boot",
                    artifactId: "spring-boot-starter"
                };
            }
            // modify xml object
            const newXml: { project: XmlNode } = getUpdatedPomXml(xml, starters, toRemove, toAdd);

            // re-generate a pom.xml
            const output: string = Utils.buildXmlContent(newXml);
            await fse.writeFile(entry.fsPath, output);
            vscode.window.showInformationMessage("Pom file successfully updated.");
            finishStep(session, stepWriteFile);
            return;
        }

        function getUpdatedPomXml(xml: any, starters: IStarters, toRemove: string[], toAdd: string[]): { project: XmlNode } {
            const ret: { project: XmlNode } = Object.assign({}, xml);
            toRemove.forEach(elem => {
                removeDependencyNode(ret.project, starters.dependencies[elem].groupId, starters.dependencies[elem].artifactId);
            });
            toAdd.forEach(elem => {
                const dep: IMavenId = starters.dependencies[elem];
                const newDepNode: DependencyNode = new DependencyNode(dep.groupId, dep.artifactId, dep.version, dep.scope);

                addDependencyNode(ret.project, newDepNode.node);

                if (dep.bom) {
                    const bom: IBom = starters.boms[dep.bom];
                    const newBomNode: BomNode = new BomNode(bom.groupId, bom.artifactId, bom.version);
                    addBomNode(ret.project, newBomNode.node);
                }

                if (dep.repository) {
                    const repo: IRepository = starters.repositories[dep.repository];
                    const newRepoNode: RepositoryNode = new RepositoryNode(dep.repository, repo.name, repo.url, repo.snapshotEnabled);
                    addRepositoryNode(ret.project, newRepoNode.node);
                }

            });
            return ret;
        }
    }
}
