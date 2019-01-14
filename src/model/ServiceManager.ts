// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import { IDependency, IStarters, ITopLevelAttribute } from ".";
import { downloadFile } from "../Utils";
import { matchRange } from "../Utils/VersionHelper";

export class ServiceManager {
    private static isCompatible(dep: IDependency, bootVersion: string): boolean {
        if (bootVersion && dep && dep.versionRange) {
            return matchRange(bootVersion, dep.versionRange);
        } else {
            return true;
        }
    }

    private serviceUrl: string;
    private overview: {
        dependencies: ITopLevelAttribute,
        // tslint:disable-next-line:no-reserved-keywords
        type: ITopLevelAttribute,
        packaging: ITopLevelAttribute,
        javaVersion: ITopLevelAttribute,
        language: ITopLevelAttribute,
        bootVersion: ITopLevelAttribute,
    };
    private starters: { [bootVersion: string]: IStarters } = {};

    constructor(serviceUrl: string) {
        this.serviceUrl = serviceUrl;
    }

    public async getStarters(bootVersion: string): Promise<IStarters> {
        if (!this.starters[bootVersion]) {
            const rawJSONString: string = await downloadFile(`${this.serviceUrl}dependencies?bootVersion=${bootVersion}`, true, { Accept: "application/vnd.initializr.v2.1+json" });
            this.starters[bootVersion] = JSON.parse(rawJSONString);
        }
        return _.cloneDeep(this.starters[bootVersion]);
    }

    public async getBootVersions(): Promise<any[]> {
        if (!this.overview) {
            await this.update();
        }
        if (!this.overview.bootVersion) {
            return [];
        } else {
            return this.overview.bootVersion.values.filter(x => x.id === this.overview.bootVersion.default)
                .concat(this.overview.bootVersion.values.filter(x => x.id !== this.overview.bootVersion.default));
        }
    }

    public async getAvailableDependencies(bootVersion: string): Promise<IDependency[]> {
        if (!this.overview) {
            await this.update();
        }
        if (!this.overview.dependencies) {
            return [];
        } else {
            const ret: IDependency[] = [];
            for (const grp of this.overview.dependencies.values) {
                const group: string = grp.name;
                ret.push(...grp.values.filter(dep => ServiceManager.isCompatible(dep, bootVersion)).map(dep => Object.assign({ group }, dep)));
            }
            return ret;
        }
    }

    private async update(): Promise<void> {
        const rawJSONString: string = await downloadFile(this.serviceUrl, true, { Accept: "application/vnd.initializr.v2.1+json" });
        this.overview = JSON.parse(rawJSONString);
    }
}
