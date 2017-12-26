import * as fse from "fs-extra";
import { IncomingMessage } from "http";
import * as https from "https";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as url from "url";
const EXTENSION_ID: string = "vscode-spring-initializr";

export namespace Utils {
    export function getTempFolder(): string {
        return path.join(os.tmpdir(), EXTENSION_ID);
    }

    export async function downloadFile(targetUrl: string, readContent?: boolean): Promise<string> {
        const tempFilePath: string = path.
            join(getTempFolder(), md5(targetUrl));
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
                res.on('data', (chunk: string|Buffer) => {
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
}
