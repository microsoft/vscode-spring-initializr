// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IDependencyNode } from "../Interfaces";

export class DependencyNode {
    public groupId: string;
    public artifactId: string;
    public version: string;
    public scope: string;
    constructor(gid: string, aid: string, ver?: string, scp?: string) {
        this.groupId = gid;
        this.artifactId = aid;
        this.version = ver;
        this.scope = scp;
    }

    public get node(): IDependencyNode {
        const ret: IDependencyNode = {
            groupId: [this.groupId],
            artifactId: [this.artifactId],
        };
        if (this.version) {
            ret.version = [this.version];
        }
        if (this.scope) {
            ret.scope = [this.scope];
        }
        return ret;
    }
}
