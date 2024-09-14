// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { serviceManager } from "../model";
import { BootVersion, MetadataType } from "../model/Metadata";
import { IPickMetadata, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyLanguageStep } from "./SpecifyLanguageStep";
import { createPickBox } from "./utils";

export class SpecifyBootVersionStep implements IStep {

    public static getInstance(): SpecifyBootVersionStep {
        return SpecifyBootVersionStep.specifyBootVersionStep;
    }

    private static specifyBootVersionStep: SpecifyBootVersionStep = new SpecifyBootVersionStep();

    public getNextStep(): IStep | undefined {
        return SpecifyLanguageStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "BootVersion", this.specifyBootVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        sendInfo(operationId, { bootVersion: projectMetadata.bootVersion });
        return this.getNextStep();
    }

    private async specifyBootVersion(projectMetadata: IProjectMetadata): Promise<boolean> {
        const items = await serviceManager.getItems(projectMetadata.serviceUrl, MetadataType.BOOTVERSION);

        if (projectMetadata.enableSmartDefaults === true) {
            const recommendedBootVersion: string = items.find(x => x.default === true)?.value?.id;

            if (recommendedBootVersion) {
                projectMetadata.bootVersion = recommendedBootVersion;
                return true;
            }
        }

        const pickMetaData: IPickMetadata<BootVersion> = {
            metadata: projectMetadata,
            title: "Spring Initializr: Specify Spring Boot version",
            pickStep: SpecifyBootVersionStep.getInstance(),
            placeholder: "Specify Spring Boot version.",
            items: items,
        };

        return await createPickBox(pickMetaData);
    }
}
