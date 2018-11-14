// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IDependency } from "./Interfaces";
import * as Metadata from "./Metadata";
import { Utils } from "./Utils";

const PLACEHOLDER: string = "";
const HINT_CONFIRM: string = "Press <Enter> to continue.";
const DEPENDENCIES_HISTORY_FILENAME: string = ".last_used_dependencies";

export class DependencyManager {

    public lastselected: IDependencyQuickPickItem = null;
    public dependencies: IDependency[] = [];
    public dict: { [key: string]: IDependency } = {};
    public selectedIds: string[] = [];

    public updateLastUsedDependencies(v: { itemType: string; id: string; }): void {
        Utils.writeFileToExtensionRoot(DEPENDENCIES_HISTORY_FILENAME, v.id);
        this.lastselected = this.genLastSelectedItem(v.id);
    }

    public async initialize(dependencies: IDependency[]): Promise<void> {
        this.dependencies = dependencies;
        for (const dep of this.dependencies) {
            this.dict[dep.id] = dep;
        }
        const idList: string = await Utils.readFileFromExtensionRoot(DEPENDENCIES_HISTORY_FILENAME);
        this.lastselected = this.genLastSelectedItem(idList);
    }

    public async getQuickPickItems(bootVersion: string, options?: { hasLastSelected: boolean }): Promise<IDependencyQuickPickItem[]> {
        if (this.dependencies.length === 0) {
            await this.initialize(await Metadata.getAvailableDependencies(bootVersion));
        }
        const ret: IDependencyQuickPickItem[] = [];
        if (this.selectedIds.length === 0) {
            if (options && options.hasLastSelected && this.lastselected) {
                ret.push(this.lastselected);
            }
        }
        ret.push({
            itemType: "selection",
            id: this.selectedIds.join(","),
            label: `$(checklist) Selected ${this.selectedIds.length} dependenc${this.selectedIds.length === 1 ? "y" : "ies"}`,
            description: "",
            detail: HINT_CONFIRM
        });

        return ret.concat(this.getSelectedDependencies().concat(this.getUnselectedDependencies()).map((dep: IDependency) => {
            return {
                itemType: "dependency",
                id: dep.id,
                label: `${this.selectedIds.indexOf(dep.id) >= 0 ? "$(check) " : PLACEHOLDER}${dep.name}`,
                description: dep.group,
                detail: dep.description
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

    private genLastSelectedItem(idList: string): IDependencyQuickPickItem {
        const availIdList: string[] = idList && idList.split(",").filter((id: string) => this.dict[id]);
        const availNameList: string[] = availIdList && availIdList.map((id: string) => this.dict[id].name).filter(Boolean);
        if (availNameList && availNameList.length) {
            return {
                itemType: "lastUsed",
                id: availIdList.join(","),
                label: "$(clock) Last used",
                description: "",
                detail: availNameList.join(", ")
            };
        } else {
            return null;
        }
    }
}

export interface IDependencyQuickPickItem extends QuickPickItem {
    itemType: string;
    id: string;
}
