// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as extract from "extract-zip";
import * as fse from "fs-extra";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { downloadFile } from "../Utils";
import { pathExists } from "../Utils/fsHelper";
import { openDialogForFolder } from "../Utils/VSCodeUI";
import { BaseHandler } from "./BaseHandler";
import { IDefaultProjectData, IProjectMetadata, IStep, ParentFolder } from "./HandlerInterfaces";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { SpecifyPackageNameStep } from "./SpecifyPackageNameStep";
import { SpecifyServiceUrlStep } from "./SpecifyServiceUrlStep";
import { ProjectType } from "../model";

const OPEN_IN_NEW_WORKSPACE = "Open";
const OPEN_IN_CURRENT_WORKSPACE = "Add to Workspace";

export class GenerateProjectHandler extends BaseHandler {

    private projectType: ProjectType;
    private outputUri: vscode.Uri;
    private metadata: IProjectMetadata;

    constructor(projectType: ProjectType, defaults?: IDefaultProjectData) {
        super();
        this.projectType = projectType;
        this.metadata = {
            pickSteps: [],
            defaults: defaults || {},
            parentFolder: vscode.workspace.getConfiguration("spring.initializr").get<ParentFolder>("parentFolder")
        };
    }

    protected get failureMessage(): string {
        return "Failed to create a project.";
    }

    public async runSteps(operationId?: string): Promise<void> {

        let step: IStep | undefined = SpecifyServiceUrlStep.getInstance();

        SpecifyArtifactIdStep.getInstance().resetDefaultInput();
        SpecifyGroupIdStep.getInstance().resetDefaultInput();
        SpecifyPackageNameStep.getInstance().resetDefaultInput();
        while (step !== undefined) {
            step = await step.execute(operationId, this.metadata);
        }

        // Step: Choose target folder
        this.outputUri = await instrumentOperationStep(operationId, "TargetFolder", specifyTargetFolder)(this.metadata);
        if (this.outputUri === undefined) { throw new OperationCanceledError("Target folder not specified."); }

        // Step: Download & Unzip
        await instrumentOperationStep(operationId, "DownloadUnzip", downloadAndUnzip)(this.downloadUrl, this.outputUri);

        // add a flag file marking it's newly created.
        const flagFile = path.join(this.outputUri.fsPath, ".vscode/NEWLY_CREATED_BY_SPRING_INITIALIZR");
        await fse.createFile(flagFile);

        // Open project either is the same workspace or new workspace
        const hasOpenFolder = vscode.workspace.workspaceFolders !== undefined || vscode.workspace.rootPath !== undefined;

        // Don't prompt to open projectLocation if it's already a currently opened folder
        if (hasOpenFolder && (vscode.workspace.workspaceFolders.some(folder => folder.uri.fsPath === this.outputUri.fsPath) || vscode.workspace.rootPath === this.outputUri.fsPath)) {
            return;
        }

        const choice = await specifyOpenMethod(hasOpenFolder, this.outputUri);

        if (choice === OPEN_IN_NEW_WORKSPACE) {
            vscode.commands.executeCommand("vscode.openFolder", this.outputUri, hasOpenFolder);
        } else if (choice === OPEN_IN_CURRENT_WORKSPACE) {
            if (!vscode.workspace.workspaceFolders.find((workspaceFolder) => workspaceFolder.uri && this.outputUri.fsPath.startsWith(workspaceFolder.uri.fsPath))) {
                vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, null, { uri: this.outputUri });
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
            `packageName=${this.metadata.packageName}`,
            `name=${this.metadata.artifactId}`,
            `packaging=${this.metadata.packaging}`,
            `bootVersion=${this.metadata.bootVersion}`,
            `dependencies=${this.metadata.dependencies.id}`,
        ];

        const targetUrl = new URL(this.metadata.serviceUrl);
        targetUrl.pathname = "/starter.zip";
        targetUrl.search = `?${params.join("&")}`;
        return targetUrl.toString();
    }
}

async function specifyTargetFolder(metadata: IProjectMetadata): Promise<vscode.Uri> {
    const OPTION_CONTINUE: string = "Continue";
    const OPTION_CHOOSE_ANOTHER_FOLDER: string = "Choose another folder";
    const LABEL_CHOOSE_FOLDER: string = "Generate into this folder";
    const MESSAGE_EXISTING_FOLDER: string = `A folder [${metadata.artifactId}] already exists in the selected folder. Continue to overwrite or Choose another folder?`;
    const MESSAGE_FOLDER_NOT_EMPTY: string = "The selected folder is not empty. Existing files with same names will be overwritten. Continue to overwrite or Choose another folder?"

    const useArtifactId: boolean = metadata.parentFolder === ParentFolder.ARTIFACT_ID;

    const MESSAGE: string = useArtifactId ? MESSAGE_EXISTING_FOLDER : MESSAGE_FOLDER_NOT_EMPTY;

    let outputUri: vscode.Uri = metadata.defaults.targetFolder ? vscode.Uri.file(metadata.defaults.targetFolder) : await openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });

    if (outputUri && useArtifactId) {
        outputUri = vscode.Uri.file(`${outputUri.fsPath}/${metadata.artifactId}`);
    }

    // If not using Artifact Id as folder name, we assume any existing files with same names will be overwritten
    // So we check if the folder is not empty, to avoid deleting files without user's consent
    while (
        (!useArtifactId && outputUri && ((await vscode.workspace.fs.readDirectory(outputUri)).length > 0))
        || (useArtifactId && outputUri && await pathExists(outputUri))
    ) {
        const overrideChoice: string = await vscode.window.showWarningMessage(MESSAGE, OPTION_CONTINUE, OPTION_CHOOSE_ANOTHER_FOLDER);
        if (overrideChoice === OPTION_CHOOSE_ANOTHER_FOLDER) {
            outputUri = await openDialogForFolder({ openLabel: LABEL_CHOOSE_FOLDER });
        } else {
            break;
        }
    }
    return outputUri;
}

async function downloadAndUnzip(targetUrl: string, targetFolder: vscode.Uri): Promise<void> {
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
            extract(filepath, { dir: targetFolder.fsPath }, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        },
    ));
}

async function specifyOpenMethod(hasOpenFolder: boolean, projectLocation: vscode.Uri): Promise<string> {
    let openMethod = vscode.workspace.getConfiguration("spring.initializr").get<string>("defaultOpenProjectMethod");
    if (openMethod !== OPEN_IN_CURRENT_WORKSPACE && openMethod !== OPEN_IN_NEW_WORKSPACE) {
        const candidates: string[] = [
            OPEN_IN_NEW_WORKSPACE,
            hasOpenFolder ? OPEN_IN_CURRENT_WORKSPACE : undefined,
        ].filter(Boolean);
        openMethod = await vscode.window.showInformationMessage(`Successfully generated. Location: ${projectLocation.fsPath}`, ...candidates);
    }
    return openMethod;
}
