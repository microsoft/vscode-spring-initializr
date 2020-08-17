// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, workspace } from "vscode";
import { instrumentOperationStep } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { ProjectMetadata } from "./GenerateProjectHandler";
import { IStep } from "./IStep";
import { SpecifyBootVersionStep } from "./SpecifyBootVersionStep";
import { createPickBox, IPickMetadata } from "./utils";

export class SpecifyPackagingStep implements IStep {

    public static getInstance(): SpecifyPackagingStep {
        return SpecifyPackagingStep.specifyPackagingStep;
    }

    private static specifyPackagingStep: SpecifyPackagingStep = new SpecifyPackagingStep();

    public getNextStep(): IStep | undefined {
        return SpecifyBootVersionStep.getInstance();
    }

    public async execute(operationId: string, projectMetadata: ProjectMetadata): Promise<IStep | undefined> {
        if (!await instrumentOperationStep(operationId, "Packaging", this.specifyPackaging)(projectMetadata)) {
            return projectMetadata.pickSteps.pop();
        }
        if (projectMetadata.packaging === undefined) {
            throw new OperationCanceledError("Packaging not specified.");
        }
        return this.getNextStep();
    }

    private async specifyPackaging(projectMetadata: ProjectMetadata): Promise<boolean> {
        const packaging: string = workspace.getConfiguration("spring.initializr").get<string>("defaultPackaging");
        if (packaging) {
            projectMetadata.packaging = packaging && packaging.toLowerCase();
            return true;
        }
        let result: boolean = false;
        const disposables: Disposable[] = [];
        try {
            const pickMetaData: IPickMetadata = {
                metadata: projectMetadata,
                disposableItems: disposables,
                pickStep: SpecifyPackagingStep.getInstance(),
                placeholder: "Specify packaging type.",
                items: [{ label: "JAR" }, { label: "WAR" }]
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
