// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickInputButton, QuickPickItem, QuickPickItemKind, ThemeIcon } from "vscode";
import { IDependency, ILink, ILinks, serviceManager } from "./model";
import { readFileFromExtensionRoot, writeFileToExtensionRoot } from "./Utils";

const HINT_CONFIRM: string = "Press <Enter> to continue.";
const DEPENDENCIES_HISTORY_FILENAME: string = ".last_used_dependencies";

export class DependencyManager {

    public lastselected: string = null;
    public dependencies: IDependency[] = [];
    public dict: { [key: string]: IDependency } = {};
    public selectedIds: string[] = [];

    constructor(public bootVersion: string) { }

    public updateLastUsedDependencies(v: IDependenciesItem): void {
        writeFileToExtensionRoot(DEPENDENCIES_HISTORY_FILENAME, v.id);
        this.lastselected = v.id;
    }

    public async initialize(dependencies: IDependency[]): Promise<void> {
        this.dependencies = dependencies;
        for (const dep of this.dependencies) {
            this.dict[dep.id] = dep;
        }
        const idList: string = await readFileFromExtensionRoot(DEPENDENCIES_HISTORY_FILENAME);
        this.lastselected = idList;
    }

    public async getQuickPickItems(serviceUrl: string, options?: { hasLastSelected: boolean }): Promise<Array<QuickPickItem & IDependenciesItem>> {
        if (this.dependencies.length === 0) {
            await this.initialize(await serviceManager.getAvailableDependencies(serviceUrl, this.bootVersion));
        }
        const ret: Array<QuickPickItem & IDependenciesItem> = [];
        if (this.selectedIds.length === 0) {
            if (options && options.hasLastSelected && this.lastselected) {
                const item = this.genLastSelectedItem(this.lastselected);
                if (item) {
                    ret.push(item);
                }
            }
        }
        ret.push({
            description: "",
            detail: HINT_CONFIRM,
            id: this.selectedIds.join(","),
            itemType: "selection",
            label: `$(checklist) Selected ${this.selectedIds.length} dependenc${this.selectedIds.length === 1 ? "y" : "ies"}`,
        });

        const selectedDeps = this.getSelectedDependencies();
        if (selectedDeps.length > 0) {
            ret.push(newSeparator("Selected"));
            const selectedItems = selectedDeps.map(dep => ({
                description: dep.group,
                detail: dep.description,
                id: dep.id,
                itemType: "dependency",
                label: `$(check) ${dep.name}`,
                // link buttons
                buttons: getLinkButtons(dep._links),
            }));
            ret.push(...selectedItems);
        }

        const unselectedDeps = this.getUnselectedDependencies();
        if (unselectedDeps.length > 0) {
            let group;
            for (const dep of unselectedDeps) {
                if (group !== dep.group) {
                    group = dep.group;
                    ret.push(newSeparator(group));
                }
                ret.push({
                    description: dep.group,
                    detail: dep.description,
                    id: dep.id,
                    itemType: "dependency",
                    label: dep.name,
                    // link buttons
                    buttons: getLinkButtons(dep._links),
                });
            }
        }

        return ret;
    }

    public getSelectedDependencies(): IDependency[] {
        return this.selectedIds.map((id: string) => this.dict[id]).filter(Boolean);
    }

    public getUnselectedDependencies(): IDependency[] {
        return this.dependencies.filter((dep: IDependency) => this.selectedIds.indexOf(dep.id) < 0);
    }

    public toggleDependency(id: string): void {
        const index: number = this.selectedIds.indexOf(id);
        if (index >= 0) {
            this.selectedIds = this.selectedIds.filter((x: string) => x !== id);
        } else {
            this.selectedIds.push(id);
        }
    }

    private genLastSelectedItem(idList: string): QuickPickItem & IDependenciesItem {
        const availIdList: string[] = idList && idList.split(",").filter((id: string) => this.dict[id]);
        const availNameList: string[] = availIdList && availIdList.map((id: string) => this.dict[id].name).filter(Boolean);
        if (availNameList && availNameList.length) {
            return {
                description: "",
                detail: availNameList.join(", "),
                id: availIdList.join(","),
                itemType: "lastUsed",
                label: "$(clock) Last used",
            };
        } else {
            return null;
        }
    }
}

function newSeparator(name: string) {
    return {
        label: name,
        kind: QuickPickItemKind.Separator,
        // below are not effective
        itemType: "separator",
        id: name
    };
}
function getLinkButtons(links?: ILinks): Array<QuickInputButton & ILink> {
    const buttons: Array<QuickInputButton & ILink> = [];
    if (links?.home?.href) {
        const homeButton = {
            iconPath: new ThemeIcon("home"),
            tooltip: links.home.title ?? "Homepage",
            ...links.home
        };
        buttons.push(homeButton);
    }
    if (links?.sample?.href) {
        const sampleButton = {
            iconPath: new ThemeIcon("repo"),
            tooltip: links.sample.title ?? "Sample",
            ...links.sample
        };
        buttons.push(sampleButton);
    }
    if (links?.reference?.href) {
        const referenceButton = {
            iconPath: new ThemeIcon("link-external"),
            tooltip: links.reference.title ?? "Reference",
            ...links.reference
        };
        buttons.push(referenceButton);
    }
    return buttons;
}

export interface IDependenciesItem { itemType: string; id: string; }
