// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { OperationCanceledError } from "../Errors";

export abstract class BaseHandler {

    protected abstract failureMessage: string;

    public async run(operationId?: string, ...args: any[]): Promise<void> {
        try {
            await this.runSteps(operationId, ...args);
        } catch (error) {
            if (!(error instanceof OperationCanceledError)) {
                vscode.window.showErrorMessage(`${this.failureMessage} ${error.message}`);
                throw error;
            }
        }
    }

    protected abstract runSteps(operationId?: string, ...args: any[]): Promise<void>;
}
