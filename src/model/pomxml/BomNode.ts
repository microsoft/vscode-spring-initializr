// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IBomNode } from "../Interfaces";

export class BomNode {
    public groupId: string;
    public artifactId: string;
    public version: string;

    constructor(gid: string, aid: string, ver: string) {
        this.groupId = gid;
        this.artifactId = aid;
        this.version = ver;
    }

    public get node(): IBomNode {
        return {
            groupId: [this.groupId],
            artifactId: [this.artifactId],
            version: [this.version],
            type: ["pom"],
            scope: ["import"],
        };
    }
}
