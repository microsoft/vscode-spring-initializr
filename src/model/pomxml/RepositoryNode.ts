// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { BooleanString, IRepositoryNode } from "../Interfaces";

export class RepositoryNode {
    public id: string;
    public name: string;
    public url: string;
    public snapshotEnabled: boolean;

    constructor(id: string, name: string, url: string, snapshotEnabled: boolean) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.snapshotEnabled = snapshotEnabled;
    }

    public get node(): IRepositoryNode {
        return {
            id: [this.id],
            name: [this.name],
            url: [this.url],
            snapshots: [
                {
                    enabled: [this.snapshotEnabled ? BooleanString.TRUE : BooleanString.FALSE],
                },
            ],
        };
    }
}
