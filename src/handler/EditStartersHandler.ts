// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { setUserError } from "vscode-extension-telemetry-wrapper";
import { dependencyManager, IDependenciesItem } from "../DependencyManager";
import {
    addBomNode,
    addDependencyNode,
    addRepositoryNode,
    BomNode,
    DependencyNode,
    getBootVersion,
    getDependencyNodes,
    IBom,
    IMavenId,
    IRepository,
    IStarters,
    removeDependencyNode,
    RepositoryNode,
    ServiceManager,
    XmlNode,
} from "../model";
import { buildXmlContent, readXmlContent } from "../Utils";
import { BaseHandler } from "./BaseHandler";
import { specifyServiceUrl } from "./utils";

export class EditStartersHandler extends BaseHandler {
    private serviceUrl: string;
    private manager: ServiceManager;

    protected get failureMessage(): string {
        return "Fail to edit starters.";
    }

    public async runSteps(_operationId: string, entry: vscode.Uri): Promise<void> {
        const deps: string[] = []; // gid:aid

        // Read pom.xml for $bootVersion, $dependencies(gid, aid)
        const content: Buffer = await fse.readFile(entry.fsPath);
        const xml: { project: XmlNode } = await readXmlContent(content.toString());

        const bootVersion: string = getBootVersion(xml.project);
        if (!bootVersion) {
            const ex = new Error("Not a valid Spring Boot project.");
            setUserError(ex);
            throw ex;
        }

        getDependencyNodes(xml.project).forEach(elem => {
            deps.push(`${elem.groupId[0]}:${elem.artifactId[0]}`);
        });

        this.serviceUrl = await specifyServiceUrl();
        if (this.serviceUrl === undefined) {
            return;
        }
        this.manager = new ServiceManager(this.serviceUrl);
        // [interaction] Step: Dependencies, with pre-selected deps
        const starters: IStarters = await vscode.window.withProgress<IStarters>(
            { location: vscode.ProgressLocation.Window },
            async (p) => {
                p.report({ message: `Fetching metadata for version ${bootVersion} ...` });
                return await this.manager.getStarters(bootVersion);
            },
        );

        const oldStarterIds: string[] = [];
        Object.keys(starters.dependencies).forEach(key => {
            const elem: IMavenId = starters.dependencies[key];
            if (deps.indexOf(`${elem.groupId}:${elem.artifactId}`) >= 0) {
                oldStarterIds.push(key);
            }
        });

        dependencyManager.selectedIds = [].concat(oldStarterIds);
        let current: IDependenciesItem = null;
        do {
            current = await vscode.window.showQuickPick(
                dependencyManager.getQuickPickItems(this.manager, bootVersion),
                {
                    ignoreFocusOut: true,
                    matchOnDescription: true,
                    matchOnDetail: true,
                    placeHolder: "Select dependencies.",
                },
            );
            if (current && current.itemType === "dependency") {
                dependencyManager.toggleDependency(current.id);
            }
        } while (current && current.itemType === "dependency");
        if (!current) { return; }

        // Diff deps for add/remove
        const toRemove: string[] = oldStarterIds.filter(elem => dependencyManager.selectedIds.indexOf(elem) < 0);
        const toAdd: string[] = dependencyManager.selectedIds.filter(elem => oldStarterIds.indexOf(elem) < 0);
        if (toRemove.length + toAdd.length === 0) {
            vscode.window.showInformationMessage("No changes.");
            return;
        }
        const msgRemove: string = (toRemove && toRemove.length) ? `Removing: [${toRemove.map(d => dependencyManager.dict[d] && dependencyManager.dict[d].name).filter(Boolean).join(", ")}].` : "";
        const msgAdd: string = (toAdd && toAdd.length) ? `Adding: [${toAdd.map(d => dependencyManager.dict[d] && dependencyManager.dict[d].name).filter(Boolean).join(", ")}].` : "";
        const choice: string = await vscode.window.showWarningMessage(`${msgRemove} ${msgAdd} Proceed?`, "Proceed", "Cancel");
        if (choice !== "Proceed") {
            return;
        }

        // add spring-boot-starter if no selected starters
        if (dependencyManager.selectedIds.length === 0) {
            toAdd.push("spring-boot-starter");
            starters.dependencies["spring-boot-starter"] = {
                artifactId: "spring-boot-starter",
                groupId: "org.springframework.boot",
            };
        }
        // modify xml object
        const newXml: { project: XmlNode } = getUpdatedPomXml(xml, starters, toRemove, toAdd);

        // re-generate a pom.xml
        const output: string = buildXmlContent(newXml);
        await fse.writeFile(entry.fsPath, output);
        vscode.window.showInformationMessage("Pom file successfully updated.");
        return;
    }

}

function getUpdatedPomXml(xml: any, starters: IStarters, toRemove: string[], toAdd: string[]): { project: XmlNode } {
    const ret: { project: XmlNode } = Object.assign({}, xml);
    toRemove.forEach(elem => {
        removeDependencyNode(ret.project, starters.dependencies[elem].groupId, starters.dependencies[elem].artifactId);
    });
    toAdd.forEach(elem => {
        const dep: IMavenId = starters.dependencies[elem];
        const newDepNode: DependencyNode = new DependencyNode(dep.groupId, dep.artifactId, dep.version, dep.scope);

        addDependencyNode(ret.project, newDepNode.node);

        if (dep.bom) {
            const bom: IBom = starters.boms[dep.bom];
            const newBomNode: BomNode = new BomNode(bom.groupId, bom.artifactId, bom.version);
            addBomNode(ret.project, newBomNode.node);
        }

        if (dep.repository) {
            const repo: IRepository = starters.repositories[dep.repository];
            const newRepoNode: RepositoryNode = new RepositoryNode(dep.repository, repo.name, repo.url, repo.snapshotEnabled);
            addRepositoryNode(ret.project, newRepoNode.node);
        }

    });
    return ret;
}
