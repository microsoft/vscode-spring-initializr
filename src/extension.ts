// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { Routines } from "./Routines";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ProjectTypes.all().forEach((projectType) => {
        context.subscriptions.push(
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType.value}`, async () => await Routines.GenerateProject.run(projectType.value))
        );
    });

    context.subscriptions.push(TelemetryWrapper.registerCommand("spring.initializr.editStarters", async (entry: vscode.Uri) => await Routines.EditStarters.run(entry)));

    context.subscriptions.push(TelemetryWrapper.registerCommand("spring.initializr.generate", async () => {
        const projectType: ProjectType = await VSCodeUI.getQuickPick(ProjectTypes.all(), item => item.title, null, null, {placeHolder: "Select project type."});
        await vscode.commands.executeCommand(`spring.initializr.${projectType.value}`);
    }));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}

type ProjectType = {
    title: string;
    value: string;
};

namespace ProjectTypes {
    export const MAVEN : ProjectType = {
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
