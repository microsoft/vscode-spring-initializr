// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as _ from "lodash";
import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initializeFromJsonFile, instrumentOperation, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { EditStartersHandler } from "./handlers/EditStartersHandler";
import { GenerateProjectHandler } from "./handlers/GenerateProjectHandler";
import { getTargetPomXml, loadPackageInfo } from "./Utils";
import { VSCodeUI } from "./Utils/VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await initializeFromJsonFile(context.asAbsolutePath("./package.json"), true);
    await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    await loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    context.subscriptions.push(
        instrumentAndRegisterCommand("spring.initializr.maven-project", async (operationId) => await new GenerateProjectHandler("maven-project").run(operationId), true),
        instrumentAndRegisterCommand("spring.initializr.gradle-project", async (operationId) => await new GenerateProjectHandler("gradle-project").run(operationId), true)
    );

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.generate", async () => {
        const projectType: string = await VSCodeUI.getQuickPick(["maven-project", "gradle-project"], _.capitalize, null, null, { placeHolder: "Select project type." });
        await vscode.commands.executeCommand(`spring.initializr.${projectType}`);
    }));

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.editStarters", async (entry?: vscode.Uri) => {
        const targetFile: vscode.Uri = entry || await getTargetPomXml();
        if (targetFile) {
            await vscode.window.showTextDocument(targetFile);
            await new EditStartersHandler().run(targetFile);
        } else {
            vscode.window.showInformationMessage("No pom.xml found in the workspace.");
        }
    }));
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

function instrumentAndRegisterCommand(name: string, cb: (...args: any[]) => any, withOperationIdAhead?: boolean): vscode.Disposable {
    const instrumented: (...args: any[]) => any = instrumentOperation(name, async (_operationId, ...args) => {
        withOperationIdAhead ? await cb(_operationId, ...args) : await cb(...args);
    });
    return TelemetryWrapper.registerCommand(name, instrumented);
}
