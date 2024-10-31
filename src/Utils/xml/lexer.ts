// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Document, isTag, Node, NodeWithChildren } from "domhandler";
import * as hp from "htmlparser2";

export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    Plugins = "plugins",
    Project = "project",
    DependencyManagement = "dependencyManagement"
}

export function getNodesByTag(text: string, tag: string): Node[] {
    // const tokens: number[][] = Lexx(text);
    const document: Document = hp.parseDocument(text, {
        withEndIndices: true,
        withStartIndices: true,
        xmlMode: true
    });
    const ret: Node[] = [];
    dfs(document, (node) => isTag(node) && node.tagName === tag, ret);
    return ret;
}

function dfs(node: Node, pred: (arg: Node) => boolean, result: Node[]) {
    if (pred(node)) {
        result.push(node);
        return;
    }
    if (node instanceof NodeWithChildren) {
        for (const child of (node as NodeWithChildren).children) {
            dfs(child, pred, result);
        }
    }
}