// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";

import { Routines } from "./Routines";
import { Utils } from "./Utils";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    await TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("package.json"));

    ["maven-project", "gradle-project"].forEach((projectType: string) => {
        context.subscriptions.push(
            TelemetryWrapper.registerCommand(`spring.initializr.${projectType}`, async () => await Routines.GenerateProject.run(projectType))
        );
    });

    context.subscriptions.push(TelemetryWrapper.registerCommand("spring.initializr.editStarters", async (entry: vscode.Uri) => await Routines.EditStarters.run(entry)));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
