// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { ConfigurationFileFormat, IConfigurationFileFormat, IHandlerItem, IProjectMetadata, IPickMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyJavaVersionStep } from "./SpecifyJavaVersionStep";
import { createPickBox } from "./utils";

export class SpecifyConfigurationFileFormatStep implements IStep {

    public static getInstance(): SpecifyConfigurationFileFormatStep {
        return SpecifyConfigurationFileFormatStep.instance;
    }

    private static instance: SpecifyConfigurationFileFormatStep = new SpecifyConfigurationFileFormatStep();

    public getNextStep(): IStep | undefined {
        return SpecifyJavaVersionStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: IProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "ConfigurationFileFormat", this.specifyConfigurationFileFormat)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        return this.getNextStep();
    }

    private async specifyConfigurationFileFormat(projectMetadata: IProjectMetadata): Promise<boolean> {

        const defaultFormat: ConfigurationFileFormat = projectMetadata.defaults.configurationFileFormat
            || workspace.getConfiguration("spring.initializr").get<ConfigurationFileFormat>("defaultConfigurationFileFormat");

        if (defaultFormat) {
            projectMetadata.configurationFileFormat = defaultFormat;
            return true;
        }

        const configurationFormats: Array<IHandlerItem<IConfigurationFileFormat>> = [
            {
                label: "Properties",
                detail: "application.properties",
                value: { id: ConfigurationFileFormat.PROPERTIES, name: "Properties" }
            },
            {
                label: "YAML",
                detail: "application.yaml",
                value: { id: ConfigurationFileFormat.YAML, name: "YAML" }
            }
        ];

        const pickMetaData: IPickMetadata<IConfigurationFileFormat> = {
            metadata: projectMetadata,
            title: "Spring Initializr: Specify configuration file format",
            pickStep: SpecifyConfigurationFileFormatStep.getInstance(),
            placeholder: "Choose configuration file format",
            items: configurationFormats
        };
        return await createPickBox(pickMetaData);
    }
}
