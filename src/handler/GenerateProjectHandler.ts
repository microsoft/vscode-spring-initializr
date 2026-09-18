// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { createWriteStream } from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import { pipeline } from "stream/promises";
import { URL } from "url";
import * as vscode from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import * as yauzl from "yauzl";
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
const UNZIP_TIMEOUT_IN_MS = 2 * 60 * 1000;

export class GenerateProjectHandler extends BaseHandler {

    private projectType: ProjectType;
    private outputUri: vscode.Uri;
    private metadata: IProjectMetadata;

    constructor(projectType: ProjectType, defaults?: IDefaultProjectData) {
        super();
        this.projectType = projectType;

        const settings = vscode.workspace.getConfiguration("spring.initializr");

        this.metadata = {
            pickSteps: [],
            defaults: defaults || {},
            parentFolder: settings.get<ParentFolder>("parentFolder"),
            useApiDefaults: settings.get("useApiDefaults")
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
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, async (p: vscode.Progress<{ message?: string }>) => {
        p.report({ message: "Downloading zip package..." });
        const filepath = await downloadFile(targetUrl);

        p.report({ message: "Starting to unzip..." });
        await unzipWithTimeout(filepath, targetFolder.fsPath);
    });
}

async function unzipWithTimeout(filepath: string, targetFolder: string): Promise<void> {
    const controller = new AbortController();
    await withTimeout(
        extractZip(filepath, targetFolder, controller.signal),
        UNZIP_TIMEOUT_IN_MS,
        "Timed out while unzipping the generated project.",
        () => controller.abort(),
    );
}

async function extractZip(filepath: string, targetFolder: string, signal: AbortSignal): Promise<void> {
    const zip = await yauzl.openPromise(filepath, { strictFileNames: true, validateEntrySizes: true });
    const targetRoot = path.resolve(targetFolder);
    const closeZip = (): void => zip.close();
    signal.addEventListener("abort", closeZip, { once: true });
    try {
        if (signal.aborted) {
            throw new Error("Zip extraction aborted.");
        }

        for await (const entry of zip.eachEntry()) {
            const targetPath = path.resolve(targetRoot, entry.fileName);
            if (targetPath !== targetRoot && !targetPath.startsWith(`${targetRoot}${path.sep}`)) {
                throw new Error(`Invalid zip entry path: ${entry.fileName}`);
            }

            if (entry.fileName.endsWith("/")) {
                await fse.ensureDir(targetPath);
                continue;
            }

            await fse.ensureDir(path.dirname(targetPath));
            const readStream = await zip.openReadStreamPromise(entry);
            await pipeline(readStream, createWriteStream(targetPath), { signal });
            const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
            if (mode !== 0) {
                await fse.chmod(targetPath, mode);
            }
        }
    } finally {
        signal.removeEventListener("abort", closeZip);
        zip.close();
    }
}

function withTimeout<T>(promise: Promise<T>, timeoutInMs: number, timeoutMessage: string, onTimeout: () => void): Promise<T> {
    return new Promise<T>((resolve: (value: T) => void, reject: (e: Error) => void): void => {
        let completed: boolean = false;
        const timeout = setTimeout((): void => {
            if (completed) {
                return;
            }

            completed = true;
            onTimeout();
            reject(new Error(timeoutMessage));
        }, timeoutInMs);

        promise.then((value: T): void => {
            if (completed) {
                return;
            }

            completed = true;
            clearTimeout(timeout);
            resolve(value);
        }, (error: Error): void => {
            if (completed) {
                return;
            }

            completed = true;
            clearTimeout(timeout);
            reject(error);
        });
    });
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
