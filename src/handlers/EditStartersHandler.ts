// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { dependencyManager, IDependencyQuickPickItem } from "../DependencyManager";
import { IBom, IMavenId, IRepository, IStarters, XmlNode } from "../Interfaces";
import * as Metadata from "../Metadata";
import { BomNode } from "../pomxml/BomNode";
import { DependencyNode } from "../pomxml/DependencyNode";
import { addBomNode, addDependencyNode, addRepositoryNode, getBootVersion, getDependencyNodes, removeDependencyNode } from "../pomxml/PomXml";
import { RepositoryNode } from "../pomxml/RepositoryNode";
import { buildXmlContent, readXmlContent } from "../Utils";

export class EditStartersHandler {

    public async run(entry: vscode.Uri): Promise<void> {
        // TO REMOVE
        const session: Session = TelemetryWrapper.currentSession();
        if (session && session.extraProperties) { session.extraProperties.finishedSteps = []; }
        // UNTIL HERE

        const deps: string[] = []; // gid:aid

        // Read pom.xml for $bootVersion, $dependencies(gid, aid)
        const content: Buffer = await fse.readFile(entry.fsPath);
        const xml: { project: XmlNode } = await readXmlContent(content.toString());

        const bootVersion: string = getBootVersion(xml.project);
        if (!bootVersion) {
            vscode.window.showErrorMessage("Not a valid Spring Boot project.");
            return;
        }
        if (session && session.extraProperties) {
            session.extraProperties.bootVersion = bootVersion;
        }

        getDependencyNodes(xml.project).forEach(elem => {
            deps.push(`${elem.groupId[0]}:${elem.artifactId[0]}`);
        });
        finishStep(session, stepBootVersion);

        // [interaction] Step: Dependencies, with pre-selected deps
        const starters: IStarters = await vscode.window.withProgress<IStarters>({ location: vscode.ProgressLocation.Window }, async (p) => {
            p.report({ message: `Fetching metadata for version ${bootVersion} ...` });
            return await Metadata.dependencies.getStarters(bootVersion);
        });

        const oldStarterIds: string[] = [];
        Object.keys(starters.dependencies).forEach(key => {
            const elem: IMavenId = starters.dependencies[key];
            if (deps.indexOf(`${elem.groupId}:${elem.artifactId}`) >= 0) {
                oldStarterIds.push(key);
            }
        });

        dependencyManager.selectedIds = [].concat(oldStarterIds);
        let current: IDependencyQuickPickItem = null;
        do {
            current = await vscode.window.showQuickPick(
                dependencyManager.getQuickPickItems(bootVersion), { ignoreFocusOut: true, placeHolder: "Select dependencies.", matchOnDetail: true, matchOnDescription: true }
            );
            if (current && current.itemType === "dependency") {
                dependencyManager.toggleDependency(current.id);
            }
        } while (current && current.itemType === "dependency");
        if (!current) { return; }
        if (session && session.extraProperties) {
            session.extraProperties.dependencies = current.id;
        }
        finishStep(session, stepDependencies);

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
            finishStep(session, stepCancel);
            return;
        } else {
            finishStep(session, stepProceed);
        }

        // add spring-boot-starter if no selected starters
        if (dependencyManager.selectedIds.length === 0) {
            toAdd.push("spring-boot-starter");
            starters.dependencies["spring-boot-starter"] = {
                groupId: "org.springframework.boot",
                artifactId: "spring-boot-starter"
            };
        }
        // modify xml object
        const newXml: { project: XmlNode } = getUpdatedPomXml(xml, starters, toRemove, toAdd);

        // re-generate a pom.xml
        const output: string = buildXmlContent(newXml);
        await fse.writeFile(entry.fsPath, output);
        vscode.window.showInformationMessage("Pom file successfully updated.");
        finishStep(session, stepWriteFile);
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

const stepBootVersion: IStep = { name: "BootVersion", info: "BootVersion identified." };
const stepDependencies: IStep = { name: "Dependencies", info: "Dependencies selected." };
const stepCancel: IStep = { name: "Cancel", info: "Canceled by user." };
const stepProceed: IStep = { name: "Proceed", info: "Confirmed by user." };
const stepWriteFile: IStep = { name: "WriteFile", info: "Pom file updated." };

interface IStep {
    name: string;
    info: string;
}

function finishStep(session: Session, step: IStep): void {
    if (session && session.extraProperties) { session.extraProperties.finishedSteps.push(step.name); }
    TelemetryWrapper.info(step.info);
}
