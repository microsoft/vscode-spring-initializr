// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { IDependenciesItem } from "../DependencyManager";
import { OperationCanceledError } from "../Errors";
import { downloadFile } from "../Utils";
import { openDialogForFolder } from "../Utils/VSCodeUI";
import { BaseHandler } from "./BaseHandler";
import { IStep } from "./IStep";
import { specifyServiceUrlStep } from "./SpecifyServiceUrlStep";

export class GenerateProjectHandler extends BaseHandler {

    private serviceUrl: string;
    private artifactId: string;
    private groupId: string;
    private language: string;
    private javaVersion: string;
    private projectType: "maven-project" | "gradle-project";
    private packaging: string;
    private bootVersion: string;
    private dependencies: IDependenciesItem;
    private outputUri: vscode.Uri;

    constructor(projectType: "maven-project" | "gradle-project") {
        super();
        this.projectType = projectType;
    }

    protected get failureMessage(): string {
        return "Fail to create a project.";
    }

    public async runSteps(operationId?: string): Promise<void> {

        let step: IStep | undefined = specifyServiceUrlStep;
        const projectMetadata: ProjectMetadata = {};
        while (step !== undefined) {
            step = await step.execute(operationId, projectMetadata);
        }

        this.serviceUrl = projectMetadata.serviceUrl;
        this.language = projectMetadata.language;
        this.javaVersion = projectMetadata.javaVersion;
        this.groupId = projectMetadata.groupId;
        this.artifactId = projectMetadata.artifactId;
        this.packaging = projectMetadata.packaging;
        this.bootVersion = projectMetadata.bootVersion;
        this.dependencies = projectMetadata.dependencies;

        // Step: Choose target folder
        this.outputUri = await instrumentOperationStep(operationId, "TargetFolder", specifyTargetFolder)(this.artifactId);
        if (this.outputUri === undefined) { throw new OperationCanceledError("Target folder not specified."); }

        // Step: Download & Unzip
        await instrumentOperationStep(operationId, "DownloadUnzip", downloadAndUnzip)(this.downloadUrl, this.outputUri.fsPath);

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
            `javaVersion=${this.javaVersion}`,
            `groupId=${this.groupId}`,
            `artifactId=${this.artifactId}`,
            `name=${this.artifactId}`,
            `packaging=${this.packaging}`,
            `bootVersion=${this.bootVersion}`,
            `baseDir=${this.artifactId}`,
            `dependencies=${this.dependencies.id}`,
        ];
        return `${this.serviceUrl}/starter.zip?${params.join("&")}`;
    }
}

export interface ProjectMetadata {
    serviceUrl?: string;
    language?: string;
    javaVersion?: string;
    groupId?: string;
    artifactId?: string;
    packaging?: string;
    bootVersion?: string;
    dependencies?: IDependenciesItem;
    firstStep?: IStep;
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
