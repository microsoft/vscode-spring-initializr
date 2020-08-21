// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { IProjectMetadata } from "./IProjectMetadata";
import { IStep } from "./IStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { createPickBox, IPickMetadata } from "./utils";

export class SpecifyLanguageStep implements IStep {

    public static getInstance(): SpecifyLanguageStep {
        return SpecifyLanguageStep.specifyLanguageStep;
    }

    private static specifyLanguageStep: SpecifyLanguageStep = new SpecifyLanguageStep();

    public getNextStep(): IStep | undefined {
        return SpecifyGroupIdStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Language", this.specifyLanguage)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyLanguage(projectMetadata: IProjectMetadata): Promise<boolean> {
        const language: string = workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
        if (language) {
            projectMetadata.language = language && language.toLowerCase();
            return true;
        }
        const pickMetaData: IPickMetadata = {
            metadata: projectMetadata,
            pickStep: SpecifyLanguageStep.getInstance(),
            placeholder: "Specify project language.",
            items: [{ label: "Java" }, { label: "Kotlin" }, { label: "Groovy" }]
        };
        return await createPickBox(pickMetaData);
    }
}
