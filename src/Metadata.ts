// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IDependency, ITopLevelAttribute } from "./Model";
import { Utils } from "./Utils";
import { Versions } from "./Versions";

export class Metadata {
    public serviceUrl: string;
    private content: {
        dependencies: ITopLevelAttribute,
        // tslint:disable-next-line:no-reserved-keywords
        type: ITopLevelAttribute,
        packaging: ITopLevelAttribute,
        javaVersion: ITopLevelAttribute,
        language: ITopLevelAttribute,
        bootVersion: ITopLevelAttribute
    };

    constructor(serviceUrl: string) {
        this.serviceUrl = serviceUrl;
    }

    public async getBootVersion(): Promise<any[]> {
        if (!this.content) {
            await this.update();
        }
        if (!this.content.bootVersion) {
            return [];
        } else {
            return this.content.bootVersion.values;
        }
    }

    public async getAvailableDependencies(bootVersion: string): Promise<IDependency[]> {
        if (!this.content) {
            await this.update();
        }
        if (!this.content.dependencies) {
            return [];
        } else {
            const ret: IDependency[] = [];
            for (const grp of this.content.dependencies.values) {
                const group: string = grp.name;
                ret.push(...grp.values.filter(dep => this.isCompatible(dep, bootVersion)).map(dep => Object.assign({ group }, dep)));
            }
            return ret;
        }
    }

    private isCompatible(dep: IDependency, bootVersion: string): boolean {
        if (bootVersion && dep && dep.versionRange) {
            return Versions.matchRange(bootVersion, dep.versionRange);
        } else {
            return true;
        }
    }

    private async update(): Promise<void> {
        const rawJSONString: string = await Utils.downloadFile(this.serviceUrl, true, { Accept: "application/vnd.initializr.v2.1+json" });
        this.content = JSON.parse(rawJSONString);
    }
}
