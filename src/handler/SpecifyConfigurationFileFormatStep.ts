// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { window, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { ConfigurationFileFormat, IProjectMetadata, IStep } from "./HandlerInterfaces";
import { SpecifyJavaVersionStep } from "./SpecifyJavaVersionStep";

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

        const defaultFormat: ConfigurationFileFormat =
            projectMetadata.defaults.configurationFileFormat
            ?? workspace.getConfiguration("spring.initializr")
                .get<ConfigurationFileFormat>("defaultConfigurationFileFormat")
            ?? ConfigurationFileFormat.PROPERTIES;


        const selection = await window.showQuickPick([
            {
                label: "Properties",
                detail: "application.properties",
                value: ConfigurationFileFormat.PROPERTIES
            },
            {
                label: "YAML",
                detail: "application.yaml",
                value: ConfigurationFileFormat.YAML
            }
        ], {
            title: "Spring Initializr: Specify configuration file format",
            placeHolder: "Choose configuration file format"
        });

        if (!selection) {
            return false;
        }

        projectMetadata.configurationFileFormat = selection.value || defaultFormat;

        return true;
    }
}
