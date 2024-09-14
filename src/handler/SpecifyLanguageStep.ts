// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { serviceManager } from "../model";
import { Language, MetadataType } from "../model/Metadata";
import { IPickMetadata, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { createPickBox } from "./utils";

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
        const language: string = projectMetadata.defaults.language || workspace.getConfiguration("spring.initializr").get<string>("defaultLanguage");
        
        if (language) {
            projectMetadata.language = language && language.toLowerCase();
            return true;
        }

        const items = await serviceManager.getItems(projectMetadata.serviceUrl, MetadataType.LANGUAGE);

        if (projectMetadata.enableSmartDefaults === true) {
            const recommendedLanguage: string = items.find(x => x.default === true)?.label.toLowerCase();

            if (recommendedLanguage) {
                projectMetadata.language = recommendedLanguage;
                return true;
            }
        }

        const pickMetaData: IPickMetadata<Language> = {
            metadata: projectMetadata,
            title: "Spring Initializr: Specify project language",
            pickStep: SpecifyLanguageStep.getInstance(),
            placeholder: "Specify project language.",
            items: items
        };
        
        return await createPickBox(pickMetaData);
    }
}
