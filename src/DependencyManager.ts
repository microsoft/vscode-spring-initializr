// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickPickItem } from "vscode";
import { IDependency } from "./Dependency";
import { Utils } from "./Utils";

const PLACEHOLDER: string = "";
const HINT_CONFIRM: string = "Press <Enter> to continue.";
const DEPENDENCIES_HISTORY_FILENAME: string = ".last_used_dependencies";

export class DependencyManager {

    private static recommended: IDependencyQuickPickItem = {
        itemType: "recommendation",
        id: "web,security,azure-active-directory",
        label: "$(thumbsup) Recommended",
        description: "",
        detail: "Web, Security, Azure Active Directory"
    };

    private static lastselected: IDependencyQuickPickItem = null;
    public dependencies: IDependency[] = [];
    public dict: { [key: string]: IDependency } = {};
    public selectedIds: string[] = [];

    public updateLastUsedDependencies(v: IDependencyQuickPickItem): void {
        Utils.writeFileToExtensionRoot(DEPENDENCIES_HISTORY_FILENAME, v.id);
        DependencyManager.lastselected = this.genLastSelectedItem(v.id);
    }

    public async initialize(): Promise<void> {
        const DEPENDENCY_URL: string = "https://start.spring.io/ui/dependencies.json?version=1.5.9.RELEASE";
        const depsJSON: { dependencies: IDependency[] } = JSON.parse(await Utils.downloadFile(DEPENDENCY_URL, true));
        this.dependencies = depsJSON.dependencies;
        for (const dep of this.dependencies) {
            this.dict[dep.id] = dep;
        }
        const idList: string = await Utils.readFileFromExtensionRoot(DEPENDENCIES_HISTORY_FILENAME);
        DependencyManager.lastselected = this.genLastSelectedItem(idList);
    }

    public async getQuickPickItems(): Promise<IDependencyQuickPickItem[]> {
        if (this.dependencies.length === 0) {
            await this.initialize();
        }
        const ret: IDependencyQuickPickItem[] = [];
        if (this.selectedIds.length === 0) {
            if (DependencyManager.lastselected) {
                ret.push(DependencyManager.lastselected);
            }
            ret.push(DependencyManager.recommended);
        } else {
            ret.push({
                itemType: "selection",
                id: this.selectedIds.join(","),
                label: `$(checklist) Selected ${this.selectedIds.length} dependenc${this.selectedIds.length === 1 ? "y" : "ies"}`,
                description: "",
                detail: HINT_CONFIRM
            });
        }

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
        return this.selectedIds.map((id: string) => this.dict[id]);
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
        const nameList: string[] = idList && idList.split(",").map((id: string) => this.dict[id].name).filter(Boolean);
        if (nameList && nameList.length) {
            return {
                itemType: "lastUsed",
                id: idList,
                label: "$(clock) Last used",
                description: "",
                detail: nameList.join(", ")
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
