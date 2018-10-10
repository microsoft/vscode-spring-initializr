// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { dispose as disposeTelemetryWrapper, initializeFromJsonFile, instrumentOperation, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { Routines } from "./Routines";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await initializeFromJsonFile(context.asAbsolutePath("./package.json"));
    await instrumentOperation("activation", initializeExtension)(context);
}

async function initializeExtension(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ProjectTypes.all().forEach((projectType) => {
        context.subscriptions.push(instrumentAndRegisterCommand(`spring.initializr.${projectType.value}`, async () => await Routines.GenerateProject.run(projectType.value)));
    });

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.editStarters", async (entry?: vscode.Uri) => {
        const targetFile: vscode.Uri = entry || await Utils.getTargetPomXml();
        if (targetFile) {
            await vscode.window.showTextDocument(entry);
            await Routines.EditStarters.run(targetFile);
        } else {
            vscode.window.showInformationMessage("No pom.xml found in the workspace.");
        }
    }));

    context.subscriptions.push(instrumentAndRegisterCommand("spring.initializr.generate", async () => {
        const projectType: ProjectType = await VSCodeUI.getQuickPick(ProjectTypes.all(), item => item.title, null, null, { placeHolder: "Select project type." });
        await vscode.commands.executeCommand(`spring.initializr.${projectType.value}`);
    }));
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

type ProjectType = {
    title: string;
    value: string;
};

namespace ProjectTypes {
    export const MAVEN: ProjectType = {
        title: "Maven Project",
        value: "maven-project"
    };
    export const GRADLE: ProjectType = {
        title: "Gradle Project",
        value: "gradle-project"
    };
    export function all(): ProjectType[] {
        return [MAVEN, GRADLE];
    }
}

function instrumentAndRegisterCommand(name: string, cb: (...args: any[]) => any): vscode.Disposable {
    const instrumented: (...args: any[]) => any = instrumentOperation(name, async (_operationId, myargs) => await cb(myargs));
    return vscode.commands.registerCommand(name, instrumented);
}
