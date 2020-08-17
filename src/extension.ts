// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import {
    dispose as disposeTelemetryWrapper,
    initializeFromJsonFile,
    instrumentOperation
} from "vscode-extension-telemetry-wrapper";
import { AddStartersHandler, GenerateProjectHandler } from "./handler";
import { getTargetPomXml, loadPackageInfo } from "./Utils";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await initializeFromJsonFile(context.asAbsolutePath("./package.json"), { firstParty: true });
    await instrumentOperation("activation", initializeExtension)(context);
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

async function initializeExtension(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    await loadPackageInfo(context);

    context.subscriptions.push(
        instrumentAndRegisterCommand("spring.initializr.maven-project", async (operationId) => await new GenerateProjectHandler("maven-project").run(operationId), true),
        instrumentAndRegisterCommand("spring.initializr.gradle-project", async (operationId) => await new GenerateProjectHandler("gradle-project").run(operationId), true),
    );

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.createProject", async () => {
        const projectType: { value: string, label: string } = await vscode.window.showQuickPick([
            { value: "maven-project", label: "Maven Project" },
            { value: "gradle-project", label: "Gradle Project" }
        ], { placeHolder: "Select project type." });
        if (projectType) {
            await vscode.commands.executeCommand(`spring.initializr.${projectType.value}`);
        }
    }));

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.addStarters", async (_oid: string, entry?: vscode.Uri) => {
        const targetFile: vscode.Uri = entry || await getTargetPomXml();
        if (targetFile) {
            await vscode.window.showTextDocument(targetFile);
            await new AddStartersHandler().run(_oid, targetFile);
        } else {
            vscode.window.showInformationMessage("No pom.xml found in the workspace.");
        }
    }, true));
}

function instrumentAndRegisterCommand(name: string, cb: (...args: any[]) => any, withOperationIdAhead?: boolean): vscode.Disposable {
    const instrumented: (...args: any[]) => any = instrumentOperation(name, async (_operationId, ...args) => {
        withOperationIdAhead ? await cb(_operationId, ...args) : await cb(...args);
    });
    return vscode.commands.registerCommand(name, instrumented);
}
