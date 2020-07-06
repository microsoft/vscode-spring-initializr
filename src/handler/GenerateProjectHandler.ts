// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { dependencyManager, IDependenciesItem } from "../DependencyManager";
import { OperationCanceledError } from "../Errors";
import { IValue, ServiceManager } from "../model";
import { artifactIdValidation, downloadFile, groupIdValidation } from "../Utils";
import { getFromInputBox, openDialogForFolder } from "../Utils/VSCodeUI";
import { BaseHandler } from "./BaseHandler";
import { specifyServiceUrl } from "./utils";

export class GenerateProjectHandler extends BaseHandler {
    private serviceUrl: string;
    private artifactId: string;
    private groupId: string;
    private language: string;
    private projectType: "maven-project" | "gradle-project";
    private packaging: string;
    private bootVersion: string;
    private dependencies: IDependenciesItem;
    private outputUri: vscode.Uri;
    private manager: ServiceManager;

    constructor(projectType: "maven-project" | "gradle-project") {
        super();
        this.projectType = projectType;
    }

    protected get failureMessage(): string {
        return "Fail to create a project.";
    }

    public async runSteps(operationId?: string): Promise<void> {

        // Step: service URL
        this.serviceUrl = await instrumentOperationStep(operationId, "serviceUrl", specifyServiceUrl)();
        if (this.serviceUrl === undefined) { throw new OperationCanceledError("Service URL not specified."); }
        this.manager = new ServiceManager(this.serviceUrl);

        // Step: language
        this.language = await instrumentOperationStep(operationId, "Language", specifyLanguage)();
        if (this.language === undefined) { throw new OperationCanceledError("Language not specified."); }

        // Step: Group Id
        this.groupId = await instrumentOperationStep(operationId, "GroupId", specifyGroupId)();
        if (this.groupId === undefined) { throw new OperationCanceledError("GroupId not specified."); }

        // Step: Artifact Id
        this.artifactId = await instrumentOperationStep(operationId, "ArtifactId", specifyArtifactId)();
        if (this.artifactId === undefined) { throw new OperationCanceledError("ArtifactId not specified."); }

        // Step: Packaging
        this.packaging = await instrumentOperationStep(operationId, "Packaging", specifyPackaging)();
        if (this.packaging === undefined) { throw new OperationCanceledError("Packaging not specified."); }

        // Step: bootVersion
        this.bootVersion = await instrumentOperationStep(operationId, "BootVersion", specifyBootVersion)(this.manager);
        if (this.bootVersion === undefined) { throw new OperationCanceledError("BootVersion not specified."); }
        sendInfo(operationId, { bootVersion: this.bootVersion });

        // Step: Dependencies
        this.dependencies = await instrumentOperationStep(operationId, "Dependencies", specifyDependencies)(this.manager, this.bootVersion);
        sendInfo(operationId, { depsType: this.dependencies.itemType, dependencies: this.dependencies.id });

        // Step: Choose target folder
        this.outputUri = await instrumentOperationStep(operationId, "TargetFolder", specifyTargetFolder)(this.artifactId);
        if (this.outputUri === undefined) { throw new OperationCanceledError("Target folder not specified."); }

        // Step: Download & Unzip
        await instrumentOperationStep(operationId, "DownloadUnzip", downloadAndUnzip)(this.downloadUrl, this.outputUri.fsPath);

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
        return `${this.serviceUrl}/starter.zip?${params.join("&")}`;
    }
}

async function specifyLanguage(): Promise<string> {
    let language: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
    if (!language) {
        language = await vscode.window.showQuickPick(
            ["Java", "Kotlin", "Groovy"],
            { ignoreFocusOut: true, placeHolder: "Specify project language." },
        );
    }
    return language && language.toLowerCase();
}

async function specifyGroupId(): Promise<string> {
    const defaultGroupId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultGroupId");
    return await getFromInputBox({
        placeHolder: "e.g. com.example",
        prompt: "Input Group Id for your project.",
        validateInput: groupIdValidation,
        value: defaultGroupId,
    });
}

async function specifyArtifactId(): Promise<string> {
    const defaultArtifactId: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultArtifactId");
    return await getFromInputBox({
        placeHolder: "e.g. demo",
        prompt: "Input Artifact Id for your project.",
        validateInput: artifactIdValidation,
        value: defaultArtifactId,
    });
}

async function specifyPackaging(): Promise<string> {
    let packaging: string = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultPackaging");
    if (!packaging) {
        packaging = await vscode.window.showQuickPick(
            ["JAR", "WAR"],
            { ignoreFocusOut: true, placeHolder: "Specify packaging type." },
        );
    }
    return packaging && packaging.toLowerCase();
}

async function specifyBootVersion(manager: ServiceManager): Promise<string> {
    const bootVersion: { value: IValue, label: string } = await vscode.window.showQuickPick<{ value: IValue, label: string }>(
        // @ts-ignore
        manager.getBootVersions().then(versions => versions.map(v => ({ value: v, label: v.name }))),
        { ignoreFocusOut: true, placeHolder: "Specify Spring Boot version." }
    );
    return bootVersion && bootVersion.value && bootVersion.value.id;
}

async function specifyDependencies(manager: ServiceManager, bootVersion: string): Promise<IDependenciesItem> {
    let current: IDependenciesItem = null;
    do {
        current = await vscode.window.showQuickPick(
            dependencyManager.getQuickPickItems(manager, bootVersion, { hasLastSelected: true }),
            { ignoreFocusOut: true, placeHolder: "Search for dependencies.", matchOnDetail: true, matchOnDescription: true },
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
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, (p: vscode.Progress<{ message?: string }>) => new Promise<void>(
        async (resolve: () => void, reject: (e: Error) => void): Promise<void> => {
            let filepath: string;
            try {
                p.report({ message: "Downloading zip package..." });
                filepath = await downloadFile(targetUrl);
            } catch (error) {
                return reject(error);
            }

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
