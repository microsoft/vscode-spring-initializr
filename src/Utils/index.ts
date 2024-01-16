// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as _ from "lodash";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";
import * as xml2js from "xml2js";

let EXTENSION_PUBLISHER: string;
let EXTENSION_NAME: string;
let EXTENSION_VERSION: string;
let EXTENSION_AI_KEY: string;

export async function loadPackageInfo(context: vscode.ExtensionContext): Promise<void> {
    const { publisher, name, version, aiKey } = await fse.readJSON(context.asAbsolutePath("./package.json"));
    EXTENSION_AI_KEY = aiKey;
    EXTENSION_PUBLISHER = publisher;
    EXTENSION_NAME = name;
    EXTENSION_VERSION = version;
}

export function getExtensionId(): string {
    return `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
}
export function getVersion(): string {
    return EXTENSION_VERSION;
}
export function getAiKey(): string {
    return EXTENSION_AI_KEY;
}
export function getTempFolder(): string {
    return path.join(os.tmpdir(), getExtensionId());
}

export async function downloadFile(targetUrl: string, readContent?: boolean, customHeaders?: {}): Promise<string> {
    const tempFilePath: string = path.join(getTempFolder(), md5(targetUrl));
    await fse.ensureDir(getTempFolder());
    if (await fse.pathExists(tempFilePath)) {
        await fse.remove(tempFilePath);
    }

    return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
        const urlObj: url.Url = url.parse(targetUrl);
        const options = Object.assign({ headers: Object.assign({}, customHeaders, { "User-Agent": `vscode/${getVersion()}` }) }, urlObj);
        let client: any;
        if (urlObj.protocol === "https:") {
            client = https;
            // tslint:disable-next-line:no-http-string
        } else if (urlObj.protocol === "http:") {
            client = http;
        } else {
            return reject(new Error("Unsupported protocol."));
        }
        client.get(options, (res: http.IncomingMessage) => {
            let rawData: string;
            let ws: fse.WriteStream;
            if (readContent) {
                rawData = "";
            } else {
                ws = fse.createWriteStream(tempFilePath);
            }
            res.on("data", (chunk: string | Buffer) => {
                if (readContent) {
                    rawData += chunk;
                } else {
                    ws.write(chunk);
                }
            });
            res.on("end", () => {
                if (readContent) {
                    resolve(rawData);
                } else {
                    ws.end();
                    ws.on("close", () => {
                        resolve(tempFilePath);
                    });
                }
            });
        }).on("error", (err: Error) => {
            reject(err);
        });
    });
}

export async function writeFileToExtensionRoot(relateivePath: string, data: string | Buffer): Promise<void> {
    const extensionRootPath: string = vscode.extensions.getExtension(getExtensionId()).extensionPath;
    const filepath: string = path.join(extensionRootPath, relateivePath);
    await fse.ensureFile(filepath);
    await fse.writeFile(filepath, data);
}

export async function readFileFromExtensionRoot(relateivePath: string): Promise<string> {
    const extensionRootPath: string = vscode.extensions.getExtension(getExtensionId()).extensionPath;
    const filepath: string = path.join(extensionRootPath, relateivePath);
    if (await fse.pathExists(filepath)) {
        const buf: Buffer = await fse.readFile(filepath);
        return buf.toString();
    } else {
        return null;
    }
}

export function groupIdValidation(value: string): string | undefined {
    return (/^[a-z_][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(value)) ? undefined : "Invalid Group Id";
}

export function artifactIdValidation(value: string): string | undefined {
    return (/^[a-z_][a-z0-9_]*(-[a-z_][a-z0-9_]*)*$/.test(value)) ? undefined : "Invalid Artifact Id";
}

export function packageNameValidation(value: string): string {
    return (/^[a-z_][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(value)) ? null : "Invalid Package Name";
}

export async function readXmlContent(xml: string, options?: {}): Promise<any> {
    const opts: {} = Object.assign({ explicitArray: true }, options);
    return new Promise<{}>(
        (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
            xml2js.parseString(xml, opts, (err: Error, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        },
    );
}

export function buildXmlContent(obj: any, options?: {}): string {
    const opts: {} = Object.assign({ explicitArray: true }, options);
    return new xml2js.Builder(opts).buildObject(obj);
}

export async function getTargetPomXml(): Promise<vscode.Uri> {
    if (vscode.window.activeTextEditor) {
        const activeUri = vscode.window.activeTextEditor.document.uri;
        if ("pom.xml" === path.basename(activeUri.path).toLowerCase()) {
            return activeUri;
        }
    }

    const candidates: vscode.Uri[] = await vscode.workspace.findFiles("**/pom.xml");
    if (!_.isEmpty(candidates)) {
        if (candidates.length === 1) {
            return candidates[0];
        } else {
            return await vscode.window.showQuickPick(
                candidates.map((c: vscode.Uri) => ({ value: c, label: getRelativePathToWorkspaceFolder(c), description: getWorkspaceFolderName(c) })),
                { placeHolder: "Select the target project." },
            ).then(res => res && res.value);
        }
    }
    return undefined;
}

function getRelativePathToWorkspaceFolder(file: vscode.Uri): string {
    if (file) {
        const wf: vscode.WorkspaceFolder = vscode.workspace.getWorkspaceFolder(file);
        if (wf) {
            return path.relative(wf.uri.fsPath, file.fsPath);
        }
    }
    return "";
}

function getWorkspaceFolderName(file: vscode.Uri): string {
    if (file) {
        const wf: vscode.WorkspaceFolder = vscode.workspace.getWorkspaceFolder(file);
        if (wf) {
            return wf.name;
        }
    }
    return "";
}
