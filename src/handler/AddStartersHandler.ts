// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { setUserError } from "vscode-extension-telemetry-wrapper";
import { DependencyManager, IDependenciesItem } from "../DependencyManager";
import {
    getBootVersion,
    getDependencyNodes,
    getParentRelativePath,
    IMavenId,
    IStarters,
    serviceManager,
    XmlNode
} from "../model";
import { readXmlContent } from "../Utils";
import { updatePom } from "../Utils/xml";
import { BaseHandler } from "./BaseHandler";
import { specifyServiceUrl } from "./utils";

export class AddStartersHandler extends BaseHandler {
    private serviceUrl: string;

    protected get failureMessage(): string {
        return "Fail to edit starters.";
    }

    public async runSteps(_operationId: string, entry: vscode.Uri): Promise<void> {
        const bootVersion: string = await searchForBootVersion(entry.fsPath);
        if (!bootVersion) {
            const ex = new Error("Not a valid Spring Boot project.");
            setUserError(ex);
            throw ex;
        }

        const deps: string[] = []; // gid:aid
        // Read pom.xml for $dependencies(gid, aid)
        const content: string = vscode.window.activeTextEditor.document.getText();
        const xml: { project: XmlNode } = await readXmlContent(content);

        getDependencyNodes(xml.project).forEach(elem => {
            deps.push(`${elem.groupId[0]}:${elem.artifactId[0]}`);
        });

        this.serviceUrl = await specifyServiceUrl();
        if (this.serviceUrl === undefined) {
            return;
        }
        // [interaction] Step: Dependencies, with pre-selected deps
        const starters: IStarters = await vscode.window.withProgress<IStarters>(
            { location: vscode.ProgressLocation.Window },
            async (p) => {
                p.report({ message: `Fetching metadata for version ${bootVersion} ...` });
                return await serviceManager.getStarters(this.serviceUrl, bootVersion);
            },
        );

        const oldStarterIds: string[] = [];
        if (!starters.dependencies) {
            await vscode.window.showErrorMessage("Unable to retrieve information of available starters.");
            return;
        }

        Object.keys(starters.dependencies).forEach(key => {
            const elem: IMavenId = starters.dependencies[key];
            if (deps.indexOf(`${elem.groupId}:${elem.artifactId}`) >= 0) {
                oldStarterIds.push(key);
            }
        });
        const dependencyManager = new DependencyManager();
        dependencyManager.selectedIds = [].concat(oldStarterIds);
        let current: IDependenciesItem = null;
        do {
            current = await vscode.window.showQuickPick(
                dependencyManager.getQuickPickItems(this.serviceUrl, bootVersion),
                {
                    ignoreFocusOut: true,
                    matchOnDescription: true,
                    matchOnDetail: true,
                    placeHolder: "Select dependencies to add.",
                },
            );
            if (current && current.itemType === "dependency" && oldStarterIds.indexOf(current.id) === -1) {
                dependencyManager.toggleDependency(current.id);
            }
        } while (current && current.itemType === "dependency");
        if (!current) { return; }

        // Diff deps for adding
        const toAdd: string[] = dependencyManager.selectedIds.filter(elem => oldStarterIds.indexOf(elem) < 0);
        if (toAdd.length === 0) {
            vscode.window.showInformationMessage("No changes.");
            return;
        }

        const msgAdd: string = (toAdd && toAdd.length) ? `Adding: [${toAdd.map(d => dependencyManager.dict[d] && dependencyManager.dict[d].name).filter(Boolean).join(", ")}].` : "";
        const choice: string = await vscode.window.showWarningMessage(`${msgAdd} Proceed?`, "Proceed", "Cancel");
        if (choice !== "Proceed") {
            return;
        }

        const artifacts = toAdd.map(id => starters.dependencies[id]);
        const bomIds = toAdd.map(id => starters.dependencies[id].bom).filter(Boolean);
        const boms = bomIds.map(id => starters.boms[id]);

        updatePom(entry.fsPath, artifacts, boms);
        vscode.window.showInformationMessage("Pom file successfully updated.");
        return;
    }

}

async function searchForBootVersion(pomPath: string): Promise<string> {
    const content: Buffer = await fse.readFile(pomPath);
    const { project: projectNode } = await readXmlContent(content.toString());
    const bootVersion: string = getBootVersion(projectNode);
    if (bootVersion) {
        return bootVersion;
    }

    // search recursively in parent pom
    const relativePath = getParentRelativePath(projectNode);
    if (relativePath) {
        let absolutePath = path.join(path.dirname(pomPath), relativePath);
        if ((await fse.stat(absolutePath)).isDirectory()) {
            absolutePath = path.join(absolutePath, "pom.xml");
        }
        if (await fse.pathExists(absolutePath)) {
            return await searchForBootVersion(absolutePath);
        }
    }
    return undefined;
}
