// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { serviceManager } from "../model";
import { JavaVersion, MetadataType } from "../model/Metadata";
import { IPickMetadata, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyDependenciesStep } from "./SpecifyDependenciesStep";
import { createPickBox } from "./utils";

export class SpecifyJavaVersionStep implements IStep {

    public static getInstance(): SpecifyJavaVersionStep {
        return SpecifyJavaVersionStep.specifyJavaVersionStep;
    }

    private static specifyJavaVersionStep: SpecifyJavaVersionStep = new SpecifyJavaVersionStep();

    public getNextStep(): IStep | undefined {
        return SpecifyDependenciesStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "JavaVersion", this.specifyJavaVersion)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyJavaVersion(projectMetadata: IProjectMetadata): Promise<boolean> {
        const javaVersion: string = projectMetadata.defaults.javaVersion || workspace.getConfiguration("spring.initializr").get<string>("defaultJavaVersion");

        if (javaVersion) {
            projectMetadata.javaVersion = javaVersion;
            return true;
        }
        
        const items = await serviceManager.getItems(projectMetadata.serviceUrl, MetadataType.JAVAVERSION);

        if (projectMetadata.useApiDefaults === true) {
            const recommendedJavaVersion: string = items.find(x => x.default === true)?.value?.id;

            if (recommendedJavaVersion) {
                projectMetadata.javaVersion = recommendedJavaVersion;
                return true;
            }
        }
        
        const pickMetaData: IPickMetadata<JavaVersion> = {
            metadata: projectMetadata,
            title: "Spring Initializr: Specify Java version",
            pickStep: SpecifyJavaVersionStep.getInstance(),
            placeholder: "Specify Java version.",
            items: items
        };
        
        return await createPickBox(pickMetaData);
    }
}
