// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import { IDependency, IStarters, ITopLevelAttribute } from "./Interfaces";
import { Utils } from "./Utils";
import { Versions } from "./Versions";

let overview: {
    dependencies: ITopLevelAttribute,
    // tslint:disable-next-line:no-reserved-keywords
    type: ITopLevelAttribute,
    packaging: ITopLevelAttribute,
    javaVersion: ITopLevelAttribute,
    language: ITopLevelAttribute,
    bootVersion: ITopLevelAttribute
};

export namespace dependencies {

    const starters: {
        [bootVersion: string]: IStarters
    } = {};

    export async function getStarters(bootVersion: string): Promise<IStarters> {
        if (!starters[bootVersion]) {
            const rawJSONString: string = await Utils.downloadFile(`${Utils.settings.getServiceUrl()}dependencies?bootVersion=${bootVersion}`, true, { Accept: "application/vnd.initializr.v2.1+json" });
            starters[bootVersion] = JSON.parse(rawJSONString);
        }
        return _.cloneDeep(starters[bootVersion]);
    }
}

export async function getBootVersions(): Promise<any[]> {
    if (!overview) {
        await update();
    }
    if (!overview.bootVersion) {
        return [];
    } else {
        return overview.bootVersion.values.filter(x => x.id === overview.bootVersion.default)
            .concat(overview.bootVersion.values.filter(x => x.id !== overview.bootVersion.default));
    }
}

export async function getAvailableDependencies(bootVersion: string): Promise<IDependency[]> {
    if (!overview) {
        await update();
    }
    if (!overview.dependencies) {
        return [];
    } else {
        const ret: IDependency[] = [];
        for (const grp of overview.dependencies.values) {
            const group: string = grp.name;
            ret.push(...grp.values.filter(dep => isCompatible(dep, bootVersion)).map(dep => Object.assign({ group }, dep)));
        }
        return ret;
    }
}

function isCompatible(dep: IDependency, bootVersion: string): boolean {
    if (bootVersion && dep && dep.versionRange) {
        return Versions.matchRange(bootVersion, dep.versionRange);
    } else {
        return true;
    }
}

async function update(): Promise<void> {
    const rawJSONString: string = await Utils.downloadFile(Utils.settings.getServiceUrl(), true, { Accept: "application/vnd.initializr.v2.1+json" });
    overview = JSON.parse(rawJSONString);
}
