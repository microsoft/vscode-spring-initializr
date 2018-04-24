// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";

export module TelemetryHelper {
    export interface IStep {
        name: string;
        info: string;
    }

    export function finishStep(step: IStep): void {
        const session: Session = TelemetryWrapper.currentSession();
        if (session && session.extraProperties) { session.extraProperties.finishedSteps.push(step.name); }
        TelemetryWrapper.info(step.info);
    }
}
