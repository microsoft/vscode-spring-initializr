import { Dependency } from "./Dependency";
import { Utils } from "./Utils";
import { QuickPickItem } from "vscode";

const PLACEHOLDER: string = "";
export class DependencyManager {

    static recommended: DependencyQuickPickItem = {
        type: "command",
        id: "web,security,azure-active-directory",
        label: "$(thumbsup) Recommended",
        description: "",
        detail: "Web,Security,Azure Active Directory"
    }
    static lastselected: DependencyQuickPickItem = null;
    public dependencies: Dependency[] = [];
    public dict: { [key: string]: Dependency } = {}
    public selectedIds: string[] = [];

    public static updateLastSelectedDependencies(v: DependencyQuickPickItem): void {
        DependencyManager.lastselected = Object.assign({}, v, {
            label: "$(clock) Last used"
        });
    }

    public async initialize(): Promise<void> {
        const DEPENDENCY_URL: string = "https://start.spring.io/ui/dependencies.json?version=1.5.9.RELEASE";
        const depsJSON = JSON.parse(await Utils.downloadFile(DEPENDENCY_URL, true));
        this.dependencies = depsJSON["dependencies"];
        for (const dep of this.dependencies) {
            this.dict[dep.id] = dep;
        }
    }

    public async getQuickPickItems(): Promise<DependencyQuickPickItem[]> {
        if (this.dependencies.length === 0) {
            await this.initialize();
        }
        const ret: DependencyQuickPickItem[] = [];
        if (this.selectedIds.length === 0) {
            if (DependencyManager.lastselected) {
                ret.push(DependencyManager.lastselected);
            }
            ret.push(DependencyManager.recommended);
        } else {
            ret.push({
                type: "command",
                id: this.selectedIds.join(","),
                label: "$(checklist) Selected dependencies",
                description: this.getSelectedDependencies().map((dep) => dep.id).join(","),
                detail: this.getSelectedDependencies().map((dep) => dep.name).join(",")
            });
        }

        return ret.concat(this.getSelectedDependencies().concat(this.getUnselectedDependencies()).map((dep: Dependency) => {
            return {
                type: "dependency",
                id: dep.id,
                label: `${this.selectedIds.indexOf(dep.id) >= 0 ? "$(check)" : PLACEHOLDER} ${dep.name}`,
                description: dep.group,
                detail: dep.description
            };
        }));
    }

    public getSelectedDependencies() {
        return this.selectedIds.map(id => this.dict[id]);
    }

    public getUnselectedDependencies() {
        return this.dependencies.filter(dep => this.selectedIds.indexOf(dep.id) < 0);
    }

    public toggleDependency(id: string) {
        const index = this.selectedIds.indexOf(id);
        if (index >= 0) {
            this.selectedIds = this.selectedIds.filter((x) => x !== id);
        } else {
            this.selectedIds.push(id);
        }
    }

    constructor() {
    }
}


export interface DependencyQuickPickItem extends QuickPickItem {
    type: string
    id: string;
}
