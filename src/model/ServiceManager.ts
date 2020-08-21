// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IDependency, IStarters } from ".";
import { downloadFile } from "../Utils";
import { matchRange } from "../Utils/VersionHelper";
import { DependencyGroup, Metadata } from "./Metadata";

/**
 * Prefer v2.2 and fallback to v2.1
 * See: https://github.com/microsoft/vscode-spring-initializr/issues/138
 */
const METADATA_HEADERS = { Accept: "application/vnd.initializr.v2.2+json,application/vnd.initializr.v2.1+json;q=0.9" };

class ServiceManager {
    private metadataMap: Map<string, Metadata> = new Map();

    public async getBootVersions(serviceUrl: string): Promise<any[]> {
        const metadata = await this.ensureMetadata(serviceUrl);
        if (!metadata) {
            throw new Error("Failed to fetch metadata from the specified URL.");
        }

        const defaultVersion: string = metadata.bootVersion.default;
        const versions = metadata.bootVersion.values;
        return versions.filter(x => x.id === defaultVersion).concat(versions.filter(x => x.id !== defaultVersion));
    }

    public async getAvailableDependencies(serviceUrl: string, bootVersion: string): Promise<IDependency[]> {
        const metadata = await this.ensureMetadata(serviceUrl);
        if (!metadata) {
            throw new Error("Failed to fetch metadata from the specified URL.");
        }

        const groups: DependencyGroup[] = metadata.dependencies.values;
        const ret: IDependency[] = [];
        for (const group of groups) {
            const groupName: string = group.name;
            const starters = group.values;
            for (const starter of starters) {
                if (!starter.versionRange || matchRange(bootVersion, starter.versionRange)) {
                    ret.push(Object.assign({ group: groupName }, starter));
                }
            }
        }
        return ret;
    }

    /**
     * @deprecated `dependencies` endpoint will be removed from metadata v3
     * This function returns information needed for current implementation of "add starters", e.g. gid/aid/repository/bom etc.
     * Should be removed in future refactoring.
     */
    public async getStarters(serviceUrl: string, bootVersion: string): Promise<IStarters> {
        const url = `${serviceUrl}dependencies?bootVersion=${bootVersion}`;
        const rawJSONString: string = await downloadFile(url, true, METADATA_HEADERS);
        try {
            const ret = JSON.parse(rawJSONString);
            return ret;
        } catch (error) {
            throw new Error(`failed to parse response from ${url}`);
        }
    }

    private async fetch(serviceUrl: string): Promise<void> {
        try {
            const rawJSONString: string = await downloadFile(serviceUrl, true, METADATA_HEADERS);
            const metadata = JSON.parse(rawJSONString);
            this.metadataMap.set(serviceUrl, metadata);
        } catch (error) {
            console.error(error);
        }
    }

    private async ensureMetadata(serviceUrl: string): Promise<Metadata> {
        if (this.metadataMap.get(serviceUrl) === undefined) {
            await this.fetch(serviceUrl);
        }
        return this.metadataMap.get(serviceUrl);
    }
}

export const serviceManager = new ServiceManager();
