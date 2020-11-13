// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Support both Legacy(v2.1) and Semver(v2.2)
 * See: https://spring.io/blog/2020/04/30/updates-to-spring-versions
 */
const strictRange: RegExp = /\[(.*),(.*)\]/;
const halfopenRightRange: RegExp = /\[(.*),(.*)\)/;
const halfopenLeftRange: RegExp = /\((.*),(.*)\]/;

/**
 * Legacy: "BUILD-SNAPSHOT" is changed to SemVer: "SNAPSHOT"
 */
const qualifiers: string[] = ["M", "RC", "BUILD-SNAPSHOT", "SNAPSHOT", "RELEASE"];

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

export function compareVersions(a: string, b: string): number {
    let result: number;

    // Legacy: "major.minor.patch.qualifier"
    // SemVer: "major.minor.patch-qualifier"
    const versionA: string[] = a.split(/\.|-/g);
    const versionB: string[] = b.split(/\.|-/g);

    // workaround for qualifier "BUILD-SNAPSHOT" in v2.1
    if (versionA.length === 5) {
        versionA[3] = `${versionA[3]}-${versionA[4]}`;
    }
    if (versionB.length === 5) {
        versionB[3] = `${versionB[3]}-${versionB[4]}`;
    }

    for (let i: number = 0; i < 3; i += 1) {
        result = parseInt(versionA[i], 10) - parseInt(versionB[i], 10);
        if (result !== 0) {
            return result;
        }
    }
    // version[3] can be undefined
    const aqualRaw: string = versionA[3] || "RELEASE";
    const bqualRaw: string = versionB[3] || "RELEASE";
    const aqual: string = parseQualifier(aqualRaw);
    const bqual: string = parseQualifier(bqualRaw);
    result = qualifiers.indexOf(aqual) - qualifiers.indexOf(bqual);
    if (result !== 0) {
        return result;
    }
    return aqualRaw.localeCompare(bqualRaw);
}

function parseQualifier(version: string): string {
    const qual: string = version.replace(/\d+/g, "");
    return qualifiers.indexOf(qual) !== -1 ? qual : "RELEASE";
}
