// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export module Versions {
    const strictRange: RegExp = /\[(.*),(.*)\]/;
    const halfopenRightRange: RegExp = /\[(.*),(.*)\)/;
    const halfopenLeftRange: RegExp = /\((.*),(.*)\]/;
    const qualifiers: string[] = ['M', 'RC', 'BUILD-SNAPSHOT', 'RELEASE'];

    export function matchRange(version: string, range: string): boolean {
        const strictMatchGrp: RegExpMatchArray = range.match(strictRange);
        if (strictMatchGrp) {
            return compareVersions(strictMatchGrp[1], version) <= 0
                && compareVersions(strictMatchGrp[2], version) >= 0;
        }
        const horMatchGrp: RegExpMatchArray = range.match(halfopenRightRange);
        if (horMatchGrp) {
            return compareVersions(horMatchGrp[1], version) <= 0
                && compareVersions(horMatchGrp[2], version) > 0;
        }
        const holMatchGrp: RegExpMatchArray = range.match(halfopenLeftRange);
        if (holMatchGrp) {
            return compareVersions(holMatchGrp[1], version) < 0
                && compareVersions(holMatchGrp[2], version) >= 0;
        }

        return compareVersions(range, version) <= 0;
    }

    function compareVersions(a: string, b: string): number {
        let result: number;

        const versionA: string[] = a.split(".");
        const versionB: string[] = b.split(".");
        for (let i: number = 0; i < 3; i += 1) {
            result = parseInt(versionA[i], 10) - parseInt(versionB[i], 10);
            if (result !== 0) {
                return result;
            }
        }
        const aqual: string = parseQualifier(versionA[3]);
        const bqual: string = parseQualifier(versionB[3]);
        result = qualifiers.indexOf(aqual) - qualifiers.indexOf(bqual);
        if (result !== 0) {
            return result;
        }
        return versionA[3].localeCompare(versionB[3]);
    }

    function parseQualifier(version: string): string {
        const qual: string = version.replace(/\d+/g, "");
        return qualifiers.indexOf(qual) !== -1 ? qual : "RELEASE";
    }
}
