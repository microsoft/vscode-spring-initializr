// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperationStep, sendInfo, Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { dependencyManager, IDependenciesItem } from "../DependencyManager";
import { OperationCanceledError } from "../Errors";
import { getBootVersions, IValue } from "../model";
import { artifactIdValidation, downloadFile, getServiceUrl, groupIdValidation } from "../Utils";
import { getFromInputBox, getQuickPick, openDialogForFolder } from "../Utils/VSCodeUI";

export class GenerateProjectHandler {
    private artifactId: string;
    private groupId: string;
    private language: string;
    private projectType: "maven-project" | "gradle-project";
    private packaging: string;
    private bootVersion: string;
    private dependencies: IDependenciesItem;
    private outputUri: vscode.Uri;

    constructor(projectType: "maven-project" | "gradle-project") {
        this.projectType = projectType;
    }

    public async run(operationId?: string): Promise<void> {
        // TO REMOVE
        const session: Session = TelemetryWrapper.currentSession();
        if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }
        // UNTIL HERE

        // Step: language
        this.language = await instrumentOperationStep(operationId, stepLanguage.name, specifyLanguage)();
        if (this.language === undefined) { throw new OperationCanceledError("Language not specified."); }
        finishStep(session, stepLanguage);

        // Step: Group Id
        this.groupId = await instrumentOperationStep(operationId, stepGroupId.name, specifyGroupId)();
        if (this.groupId === undefined) { throw new OperationCanceledError("GroupId not specified."); }
        finishStep(session, stepGroupId);

        // Step: Artifact Id
        this.artifactId = await instrumentOperationStep(operationId, stepArtifactId.name, specifyArtifactId)();
        if (this.artifactId === undefined) { throw new OperationCanceledError("ArtifactId not specified."); }
        finishStep(session, stepArtifactId);

        // Step: Packaging
        this.packaging = await instrumentOperationStep(operationId, "Packaging", specifyPackaging)();
        if (this.packaging === undefined) { throw new OperationCanceledError("Packaging not specified."); }

        // Step: bootVersion
        this.bootVersion = await instrumentOperationStep(operationId, stepBootVersion.name, specifyBootVersion)();
        if (this.bootVersion === undefined) { throw new OperationCanceledError("BootVersion not specified."); }
        sendInfo(operationId, { bootVersion: this.bootVersion });
        finishStep(session, stepBootVersion);

        // Step: Dependencies
        this.dependencies = await instrumentOperationStep(operationId, stepDependencies.name, specifyDependencies)(this.bootVersion);
        sendInfo(operationId, { depsType: this.dependencies.itemType, dependencies: this.dependencies.id });
        // TO REMOVE
        if (session && session.extraProperties) {
            session.extraProperties.depsType = this.dependencies.itemType;
            session.extraProperties.dependencies = this.dependencies.id;
        }
        finishStep(session, stepDependencies);
        // UNTIL HERE

        // Step: Choose target folder
        this.outputUri = await instrumentOperationStep(operationId, stepTargetFolder.name, specifyTargetFolder)(this.artifactId);
        if (this.outputUri === undefined) { throw new OperationCanceledError("Target folder not specified."); }
        finishStep(session, stepTargetFolder);

        // Step: Download & Unzip
        await instrumentOperationStep(operationId, stepDownloadUnzip.name, downloadAndUnzip)(this.downloadUrl, this.outputUri.fsPath);
        finishStep(session, stepDownloadUnzip);

        dependencyManager.updateLastUsedDependencies(this.dependencies);

        // Open in new window
        const hasOpenFolder: boolean = (vscode.workspace.workspaceFolders !== undefined);
        const candidates: string[] = [
            "Open",
            hasOpenFolder ? "Add to Workspace" : undefined,
        ].filter(Boolean);
        const choice: string = await vscode.window.showInformationMessage(`Successfully generated. Location: ${this.outputUri.fsPath}`, ...candidates);
        if (choice === "Open") {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path.join(this.outputUri.fsPath, this.artifactId)), hasOpenFolder);
        } else if (choice === "Add to Workspace") {
            vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, null, { uri: vscode.Uri.file(path.join(this.outputUri.fsPath, this.artifactId)) });
        }
    }

    private get downloadUrl(): string {
        const params: string[] = [
            `type=${this.projectType}`,
            `language=${this.language}`,
            `groupId=${this.groupId}`,
            `artifactId=${this.artifactId}`,
            `packaging=${this.packaging}`,
            `bootVersion=${this.bootVersion}`,
            `baseDir=${this.artifactId}`,
            `dependencies=${this.dependencies.id}`,
        ];
        return `${getServiceUrl()}/starter.zip?${params.join("&")}`;
    }
}

async function specifyLanguage(): Promise<string> {
    let language: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
    if (!language) {
        language = await vscode.window.showQuickPick(
            ["Java", "Kotlin", "Groovy"],
            { ignoreFocusOut: true, placeHolder: STEP_LANGUAGE_MESSAGE },
        );
    }
    return language && language.toLowerCase();
}

async function specifyGroupId(): Promise<string> {
    const defaultGroupId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
    return await getFromInputBox({
        placeHolder: "e.g. com.example",
        prompt: STEP_GROUPID_MESSAGE,
        validateInput: groupIdValidation,
        value: defaultGroupId,
    });
}

async function specifyArtifactId(): Promise<string> {
    const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
    return await getFromInputBox({
        placeHolder: "e.g. demo",
        prompt: STEP_ARTIFACTID_MESSAGE,
        validateInput: artifactIdValidation,
        value: defaultArtifactId,
    });
}

async function specifyPackaging(): Promise<string> {
    let packaging: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultPackaging");
    if (!packaging) {
        packaging = await vscode.window.showQuickPick(
            ["JAR", "WAR"],
            { ignoreFocusOut: true, placeHolder: STEP_PACKAGING_MESSAGE },
        );
    }
    return packaging && packaging.toLowerCase();
}

async function specifyBootVersion(): Promise<string> {
    const bootVersion: IValue = await getQuickPick<IValue>(
        getBootVersions(),
        version => version.name,
        version => version.description,
        null,
        { placeHolder: STEP_BOOTVERSION_MESSAGE },
    );
    return bootVersion && bootVersion.id;
}

async function specifyDependencies(bootVersion: string): Promise<IDependenciesItem> {
    let current: IDependenciesItem = null;
    do {
        current = await vscode.window.showQuickPick(
            dependencyManager.getQuickPickItems(bootVersion, { hasLastSelected: true }), { ignoreFocusOut: true, placeHolder: STEP_DEPENDENCY_MESSAGE, matchOnDetail: true, matchOnDescription: true },
        );
        if (current && current.itemType === "dependency") {
            dependencyManager.toggleDependency(current.id);
        }
    } while (current && current.itemType === "dependency");
    if (!current) {
        throw new OperationCanceledError("Canceled on dependency seletion.");
    }
    return current;
}

async function specifyTargetFolder(projectName: string): Promise<vscode.Uri> {
    const OPTION_CONTINUE: string = "Continue";
    const OPTION_CHOOSE_ANOTHER_FOLDER: string = "Choose another folder";
    const LABEL_CHOOSE_FOLDER: string = "Generate into this folder";
    const MESSAGE_EXISTING_FOLDER: string = `A folder [${projectName}] already exists in the selected folder. Continue to overwrite or Choose another folder?`;

    let outputUri: vscode.Uri = await openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
    while (outputUri && await fse.pathExists(path.join(outputUri.fsPath, projectName))) {
        const overrideChoice: string = await vscode.window.showWarningMessage(MESSAGE_EXISTING_FOLDER, OPTION_CONTINUE, OPTION_CHOOSE_ANOTHER_FOLDER);
        if (overrideChoice === OPTION_CHOOSE_ANOTHER_FOLDER) {
            outputUri = await openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
        } else {
            break;
        }
    }
    return outputUri;
}

async function downloadAndUnzip(targetUrl: string, targetFolder: string): Promise<void> {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
        async (resolve: () => void, reject: (e: Error) => void): Promise<void> => {
            p.report({ message: "Downloading zip package..." });
            const filepath: string = await downloadFile(targetUrl);
            p.report({ message: "Starting to unzip..." });
            extract(filepath, { dir: targetFolder }, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        },
    ));
}
// TO REMOVE
interface IStep {
    name: string;
    info: string;
}

function finishStep(session: Session, step: IStep): void {
    if (session && session.extraProperties) { session.extraProperties.finishedSteps.push(step.name); }
    TelemetryWrapper.info(step.info);
}
// UNTIL HERE

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
