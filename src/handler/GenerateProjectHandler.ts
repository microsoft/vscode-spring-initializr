// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { downloadFile } from "../Utils";
import { openDialogForFolder } from "../Utils/VSCodeUI";
import { BaseHandler } from "./BaseHandler";
import { IProjectMetadata, IDefaultProjectData } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { SpecifyServiceUrlStep } from "./SpecifyServiceUrlStep";

const OPEN_IN_NEW_WORKSPACE = "Open";
const OPEN_IN_CURRENT_WORKSPACE = "Add to Workspace";

export class GenerateProjectHandler extends BaseHandler {

    private projectType: "maven-project" | "gradle-project";
    private outputUri: vscode.Uri;
    private metadata: IProjectMetadata;

    constructor(projectType: "maven-project" | "gradle-project", defaults?: IDefaultProjectData) {
        super();
        this.projectType = projectType;
        this.metadata = {
            pickSteps: [],
            defaults: defaults || {}
        };
    }

    protected get failureMessage(): string {
        return "Fail to create a project.";
    }

    public async runSteps(operationId?: string): Promise<void> {

        let step: IStep | undefined = SpecifyServiceUrlStep.getInstance();

        SpecifyArtifactIdStep.getInstance().resetDefaultInput();
        SpecifyGroupIdStep.getInstance().resetDefaultInput();
        while (step !== undefined) {
            step = await step.execute(operationId, this.metadata);
        }

        // Step: Choose target folder
        this.outputUri = await instrumentOperationStep(operationId, "TargetFolder", specifyTargetFolder)(this.metadata);
        if (this.outputUri === undefined) { throw new OperationCanceledError("Target folder not specified."); }

        // Step: Download & Unzip
        await instrumentOperationStep(operationId, "DownloadUnzip", downloadAndUnzip)(this.downloadUrl, this.outputUri.fsPath);

        // Open project either is the same workspace or new workspace
        const hasOpenFolder = vscode.workspace.workspaceFolders !== undefined || vscode.workspace.rootPath !== undefined;
        const projectLocation = this.outputUri.fsPath;
        const choice = await specifyOpenMethod(hasOpenFolder, this.outputUri.fsPath);
        if (choice === OPEN_IN_NEW_WORKSPACE) {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(path.join(projectLocation, this.metadata.artifactId)), hasOpenFolder);
        } else if (choice === OPEN_IN_CURRENT_WORKSPACE) {
            if (!vscode.workspace.rootPath || !this.outputUri.fsPath.startsWith(vscode.workspace.rootPath)) {
                if (!vscode.workspace.workspaceFolders.find((workspaceFolder) => workspaceFolder.uri && this.outputUri.fsPath.startsWith(workspaceFolder.uri.fsPath))) {
                    vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, null, { uri: vscode.Uri.file(path.join(projectLocation, this.metadata.artifactId)) });
                }
            }
        }
    }

    private get downloadUrl(): string {
        const params: string[] = [
            `type=${this.projectType}`,
            `language=${this.metadata.language}`,
            `javaVersion=${this.metadata.javaVersion}`,
            `groupId=${this.metadata.groupId}`,
            `artifactId=${this.metadata.artifactId}`,
            `name=${this.metadata.artifactId}`,
            `packaging=${this.metadata.packaging}`,
            `bootVersion=${this.metadata.bootVersion}`,
            `baseDir=${this.metadata.artifactId}`,
            `dependencies=${this.metadata.dependencies.id}`,
        ];
        return `${this.metadata.serviceUrl}/starter.zip?${params.join("&")}`;
    }
}

async function specifyTargetFolder(metadata: IProjectMetadata): Promise<vscode.Uri> {
    const OPTION_CONTINUE: string = "Continue";
    const OPTION_CHOOSE_ANOTHER_FOLDER: string = "Choose another folder";
    const LABEL_CHOOSE_FOLDER: string = "Generate into this folder";
    const MESSAGE_EXISTING_FOLDER: string = `A folder [${metadata.artifactId}] already exists in the selected folder. Continue to overwrite or Choose another folder?`;

    let outputUri: vscode.Uri = metadata.defaults.targetFolder ? vscode.Uri.file(metadata.defaults.targetFolder) : await openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
    while (outputUri && await fse.pathExists(path.join(outputUri.fsPath, metadata.artifactId))) {
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

async function specifyOpenMethod(hasOpenFolder: boolean, projectLocation: string): Promise<string> {
    let openMethod = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultOpenProjectMethod");
    if (openMethod !== OPEN_IN_CURRENT_WORKSPACE && openMethod !== OPEN_IN_NEW_WORKSPACE) {
        const candidates: string[] = [
            OPEN_IN_NEW_WORKSPACE,
            hasOpenFolder ? OPEN_IN_CURRENT_WORKSPACE : undefined,
        ].filter(Boolean);
        openMethod = await vscode.window.showInformationMessage(`Successfully generated. Location: ${projectLocation}`, ...candidates);
    }
    return openMethod;
}
