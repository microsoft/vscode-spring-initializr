// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyJavaVersionStep } from "./SpecifyJavaVersionStep";
import { createPickBox, IPickMetadata } from "./utils";

export class SpecifyLanguageStep implements IStep {

    public static getInstance(): SpecifyLanguageStep {
        return SpecifyLanguageStep.specifyLanguageStep;
    }

    private static specifyLanguageStep: SpecifyLanguageStep = new SpecifyLanguageStep();

    public getNextStep(): IStep | undefined {
        return SpecifyJavaVersionStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Language", this.specifyLanguage)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.language === undefined) {
            throw new OperationCanceledError("Language not specified.");
        }
        return this.getNextStep();
    }

    private async specifyLanguage(projectMetadata: ProjectMetadata): Promise<boolean> {
        const language: string = workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
        if (language) {
            projectMetadata.language = language && language.toLowerCase();
            return true;
        }
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            const pickMetaData: IPickMetadata = {
                metadata: projectMetadata,
                disposableItems: disposables,
                pickStep: SpecifyLanguageStep.getInstance(),
                placeholder: "Specify project language.",
                items: [{ label: "Java" }, { label: "Kotlin" }, { label: "Groovy" }]
            };
            result = await createPickBox(pickMetaData);
        } finally {
            for (const d of disposables) {
                d.dispose();
            }
        }
        return result;
    }
}
