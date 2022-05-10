// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import { IBomNode, IDependencyNode, IRepositoryNode, XmlNode } from "../Interfaces";

function isNullOrEmptyNode(node: any): boolean {
    return _.isEmpty(node) || _.isEqual(node, [""]);
}

function isNullNode(node: any) {
    return _.isEmpty(node);
}

function ensureNode(parentNode: XmlNode, nodeName: string, defaultValue: any): any {
    if (isNullOrEmptyNode(parentNode[nodeName])) {
        parentNode[nodeName] = [defaultValue];
    }
    return parentNode[nodeName][0];
}

function getNode(parentNode: any, nodeName: string, fallbackValue?: any, allowEmpty?: boolean): any {
    if (allowEmpty) {
        return isNullNode(parentNode[nodeName]) ? fallbackValue : parentNode[nodeName][0];
    } else {
        return isNullOrEmptyNode(parentNode[nodeName]) ? fallbackValue : parentNode[nodeName][0];
    }
}

export function addDependencyNode(projectNode: XmlNode, node: IDependencyNode): void {
    const dependenciesNode: any = ensureNode(projectNode, "dependencies", {});
    if (isNullOrEmptyNode(dependenciesNode.dependency)) {
        dependenciesNode.dependency = [node];
    } else {
        // insert if not exists
        if (!dependenciesNode.dependency.find(elem => _.isEqual(elem, node))) {
            dependenciesNode.dependency.push(node);
        }
    }
}

export function removeDependencyNode(projectNode: XmlNode, groupId: string, artifactId: string): void {
    const dependenciesNode: any = ensureNode(projectNode, "dependencies", {});
    if (!isNullOrEmptyNode(dependenciesNode.dependency)) {
        dependenciesNode.dependency = dependenciesNode.dependency.filter(elem => !(groupId === elem.groupId[0] && artifactId === elem.artifactId[0]));
    }
}

export function getDependencyNodes(projectNode: XmlNode): IDependencyNode[] {
    const dependenciesNode: XmlNode = getNode(projectNode, "dependencies", {});
    if (dependenciesNode.dependency) {
        return [].concat(dependenciesNode.dependency);
    } else {
        return [];
    }
}

export function addBomNode(projectNode: XmlNode, node: IBomNode): void {
    const dependencyManagementNode: XmlNode = ensureNode(projectNode, "dependencyManagement", {});
    const dependenciesNode: any = ensureNode(dependencyManagementNode, "dependencies", {});
    if (isNullOrEmptyNode(dependenciesNode.dependency)) {
        dependenciesNode.dependency = [node];
    } else {
        // insert if not exists
        if (!dependenciesNode.dependency.find(elem => _.isEqual(elem, node))) {
            dependenciesNode.dependency.push(node);
        }
    }
}

export function addRepositoryNode(projectNode: XmlNode, node: IRepositoryNode): void {
    const repositoriesNode: any = ensureNode(projectNode, "repositories", {});
    if (isNullOrEmptyNode(repositoriesNode.repository)) {
        repositoriesNode.repository = [node];
    } else {
        // insert if not exists
        if (!repositoriesNode.repository.find(elem => _.isEqual(elem, node))) {
            repositoriesNode.repository.push(node);
        }
    }
}

export function getBootVersion(projectNode: XmlNode): string {
    let bootVersion: string;
    const parentNode: XmlNode = getNode(projectNode, "parent", {});
    if (getNode(parentNode, "artifactId") === "spring-boot-starter-parent" && getNode(parentNode, "groupId") === "org.springframework.boot") {
        bootVersion = getNode(parentNode, "version");
    }
    return bootVersion;
}

/**
 * Get value of <relativePath> under <parent> node.
 * @param projectNode xml object of <project> node.
 * @returns value of <relativePath> node. Defaults to "../pom.xml" if unspecified.
 */
export function getParentRelativePath(projectNode: XmlNode): string {
    const parentNode: XmlNode = getNode(projectNode, "parent", {});
    return getNode(parentNode, "relativePath", "../pom.xml", true);
}
