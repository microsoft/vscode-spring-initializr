// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IDependency, ServiceManager } from "./model";
import { readFileFromExtensionRoot, writeFileToExtensionRoot } from "./Utils";

const PLACEHOLDER: string = "";
const HINT_CONFIRM: string = "Press <Enter> to continue.";
const DEPENDENCIES_HISTORY_FILENAME: string = ".last_used_dependencies";

class DependencyManager {

    public lastselected: string = null;
    public dependencies: IDependency[] = [];
    public dict: { [key: string]: IDependency } = {};
    public selectedIds: string[] = [];

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

    public async getQuickPickItems(manager: ServiceManager, bootVersion: string, options?: { hasLastSelected: boolean }): Promise<Array<QuickPickItem & IDependenciesItem>> {
        if (this.dependencies.length === 0) {
            await this.initialize(await manager.getAvailableDependencies(bootVersion));
        }
        const ret: Array<QuickPickItem & IDependenciesItem> = [];
        if (this.selectedIds.length === 0) {
            if (options && options.hasLastSelected && this.lastselected) {
                ret.push(this.genLastSelectedItem(this.lastselected));
            }
        }
        ret.push({
            description: "",
            detail: HINT_CONFIRM,
            id: this.selectedIds.join(","),
            itemType: "selection",
            label: `$(checklist) Selected ${this.selectedIds.length} dependenc${this.selectedIds.length === 1 ? "y" : "ies"}`,
        });

        return ret.concat(this.getSelectedDependencies().concat(this.getUnselectedDependencies()).map((dep: IDependency) => {
            return {
                description: dep.group,
                detail: dep.description,
                id: dep.id,
                itemType: "dependency",
                label: `${this.selectedIds.indexOf(dep.id) >= 0 ? "$(check) " : PLACEHOLDER}${dep.name}`,
            };
        }));
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

export interface IDependenciesItem { itemType: string; id: string; }

// tslint:disable-next-line:export-name
export const dependencyManager: DependencyManager = new DependencyManager();
