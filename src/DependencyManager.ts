import { QuickPickItem } from "vscode";
import { IDependency } from "./Dependency";
import { Utils } from "./Utils";

const PLACEHOLDER: string = "";
export class DependencyManager {

    private static recommended: IDependencyQuickPickItem = {
        itemType: "command",
        id: "web,security,azure-active-directory",
        label: "$(thumbsup) Recommended",
        description: "",
        detail: "Web,Security,Azure Active Directory"
    };

    private static lastselected: IDependencyQuickPickItem = null;
    public dependencies: IDependency[] = [];
    public dict: { [key: string]: IDependency } = {};
    public selectedIds: string[] = [];

    public static UPDATE_LAST_USED_DEPENDENCIES(v: IDependencyQuickPickItem): void {
        DependencyManager.lastselected = Object.assign({}, v, {
            label: "$(clock) Last used"
        });
    }

    public async initialize(): Promise<void> {
        const DEPENDENCY_URL: string = "https://start.spring.io/ui/dependencies.json?version=1.5.9.RELEASE";
        const depsJSON: { dependencies: IDependency[] } = JSON.parse(await Utils.downloadFile(DEPENDENCY_URL, true));
        this.dependencies = depsJSON.dependencies;
        for (const dep of this.dependencies) {
            this.dict[dep.id] = dep;
        }
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
                itemType: "command",
                id: this.selectedIds.join(","),
                label: `$(checklist) Selected ${this.selectedIds.length} dependenc${this.selectedIds.length === 1 ? "y" : "ies"}`,
                description: "",
                detail: "Finish ?"
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

}

export interface IDependencyQuickPickItem extends QuickPickItem {
    itemType: string;
    id: string;
}
