// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IBomNode, IDependencyNode, IRepositoryNode } from "../Interfaces";

export function addDependencyNode(xmlObj: any, node: IDependencyNode): void {
    //todo insert if not exists
    xmlObj.project.dependencies[0].dependency.push(node);
}

export function removeDependencyNode(xmlObj: any, groupId: string, artifactId: string): void {
    xmlObj.project.dependencies[0].dependency = xmlObj.project.dependencies[0].dependency.filter(elem => !(groupId === elem.groupId[0] && artifactId === elem.artifactId[0]));
}

export function addBomNode(xmlObj: any, node: IBomNode): void {
    if (!xmlObj.project.dependencyManagement) {
        xmlObj.project.dependencyManagement = [{}];
    }
    if (!xmlObj.project.dependencyManagement[0].dependencies) {
        xmlObj.project.dependencyManagement[0].dependencies = [{}];
    }
    if (!xmlObj.project.dependencyManagement[0].dependencies[0].dependency) {
        xmlObj.project.dependencyManagement[0].dependencies[0].dependency = [node];
    } else {
        //todo insert if not exists
        xmlObj.project.dependencyManagement[0].dependencies[0].dependency.push(node);
    }
}

export function addRepositoryNode(xmlObj: any, node: IRepositoryNode): void {
    if (!xmlObj.project.repositories) {
        xmlObj.project.repositories = [{}];
    }
    if (!xmlObj.project.repositories[0].repository) {
        xmlObj.project.repositories[0].repository = [node];
    } else {
        //todo insert if not exists
        xmlObj.project.repositories[0].repository.push(node);
    }
}
