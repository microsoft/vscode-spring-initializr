// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import { IncomingMessage } from "http";
import * as https from "https";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import { ExtensionContext, extensions } from 'vscode';
let EXTENSION_PUBLISHER: string;
let EXTENSION_NAME: string;
let EXTENSION_VERSION: string;
let EXTENSION_AI_KEY: string;

export namespace Utils {
    export function loadPackageInfo(context: ExtensionContext): void {
        const { publisher, name, version, aiKey } = fse.readJSONSync(context.asAbsolutePath("./package.json"));
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

    export async function downloadFile(targetUrl: string, readContent?: boolean): Promise<string> {
        const tempFilePath: string = path.join(getTempFolder(), md5(targetUrl));
        await fse.ensureDir(getTempFolder());
        if (await fse.pathExists(tempFilePath)) {
            await fse.remove(tempFilePath);
        }

        return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
            https.get(url.parse(targetUrl), (res: IncomingMessage) => {
                let rawData: string;
                let ws: fse.WriteStream;
                if (readContent) {
                    rawData = "";
                } else {
                    ws = fse.createWriteStream(tempFilePath);
                }
                res.on('data', (chunk: string | Buffer) => {
                    if (readContent) {
                        rawData += chunk;
                    } else {
                        ws.write(chunk);
                    }
                });
                res.on('end', () => {
                    if (readContent) {
                        resolve(rawData);
                    } else {
                        ws.end();
                        resolve(tempFilePath);
                    }
                });
            }).on("error", (err: Error) => {
                reject(err);
            });
        });
    }

    export async function writeFileToExtensionRoot(relateivePath: string, data: string | Buffer): Promise<void> {
        const extensionRootPath: string = extensions.getExtension(getExtensionId()).extensionPath;
        const filepath: string = path.join(extensionRootPath, relateivePath);
        await fse.ensureFile(filepath);
        await fse.writeFile(filepath, data);
    }

    export async function readFileFromExtensionRoot(relateivePath: string): Promise<string> {
        const extensionRootPath: string = extensions.getExtension(getExtensionId()).extensionPath;
        const filepath: string = path.join(extensionRootPath, relateivePath);
        if (await fse.pathExists(filepath)) {
            const buf: Buffer = await fse.readFile(filepath);
            return buf.toString();
        } else {
            return null;
        }
    }
}
