// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { URL } from "url";
import { IDependency, IStarters } from ".";
import { IHandlerItem } from "../handler/HandlerInterfaces";
import { downloadFile } from "../Utils";
import { matchRange } from "../Utils/VersionHelper";
import { DependencyGroup, Identifiable, MatadataType, Metadata } from "./Metadata";

/**
 * Prefer v2.2 and fallback to v2.1
 * See: https://github.com/microsoft/vscode-spring-initializr/issues/138
 */
const METADATA_HEADERS = { Accept: "application/vnd.initializr.v2.2+json,application/vnd.initializr.v2.1+json;q=0.9" };

class ServiceManager {
    private metadataMap: Map<string, Metadata> = new Map();

    public async getItems<T extends Identifiable>(serviceUrl: string, type: MatadataType): Promise<Array<IHandlerItem<T>>> {
        const metadata = await this.ensureMetadata(serviceUrl);
        if (!metadata) {
            throw new Error("Failed to fetch metadata.");
        }
        let defaultLabel: string;
        let values: any[];
        switch (type) {
            case MatadataType.BOOTVERSION:
                defaultLabel = metadata.bootVersion.default;
                values = metadata.bootVersion.values;
                break;
            case MatadataType.JAVAVERSION:
                defaultLabel = metadata.javaVersion.default;
                values = metadata.javaVersion.values;
                break;
            case MatadataType.LANGUAGE:
                defaultLabel = metadata.language.default;
                values = metadata.language.values;
                break;
            case MatadataType.PACKAGING:
                defaultLabel = metadata.packaging.default;
                values = metadata.packaging.values;
                break;
            default:
                throw new Error("Invalid metadata type.");
        }

        const sortedValues = values.filter(x => x.id === defaultLabel).concat(values.filter(x => x.id !== defaultLabel));
        switch (type) {
            case MatadataType.BOOTVERSION:
                return sortedValues.map(v => ({ value: v, label: v.name }));
            case MatadataType.JAVAVERSION:
                return sortedValues.map(v => ({ value: v, label: v.name }));
            default:
                return sortedValues.map(v => ({ label: v.name }));
        }
    }

    public async getAvailableDependencies(serviceUrl: string, bootVersion: string): Promise<IDependency[]> {
        const metadata = await this.ensureMetadata(serviceUrl);
        if (!metadata) {
            throw new Error("Failed to fetch metadata.");
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
        const url = new URL(serviceUrl);
        url.pathname = "/dependencies";
        url.search = `?bootVersion=${bootVersion}`;
        const rawJSONString: string = await downloadFile(url.toString(), true, METADATA_HEADERS);
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
