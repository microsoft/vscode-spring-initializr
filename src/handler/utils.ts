// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

const DEFAULT_SERVICE_URL: string = "https://start.spring.io/";

export async function specifyServiceUrl(): Promise<string> {
    const configValue = vscode.workspace.getConfiguration("spring.initializr").get<string | string[]>("serviceUrl");
    if (typeof configValue === "string") {
        return configValue;
    } else if (typeof configValue === "object" && configValue instanceof Array && configValue.length > 0) {
        if (configValue.length === 1) {
            return configValue[0];
        }
        return await vscode.window.showQuickPick(configValue, { ignoreFocusOut: true, placeHolder: "Select the service URL." });
    } else {
        return DEFAULT_SERVICE_URL;
    }
}
