// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { UserError } from "../error";
import { ElementNode, getNodesByTag, XmlTagName } from "./lexer";

export async function updatePom(pomPath: string, deps: IArtifact[], boms: IBom[]) {
    const edit = new vscode.WorkspaceEdit();

    const projectNode: ElementNode = await getActiveProjectNode();
    const dependenciesNode: ElementNode | undefined = projectNode.children && projectNode.children.find(node => node.tag === XmlTagName.Dependencies);
    if (dependenciesNode !== undefined) {
        await updateWorkspaceEdit(edit, pomPath, dependenciesNode, new DependencyNodes(deps));
    } else {
        await updateWorkspaceEdit(edit, pomPath, projectNode, new DependencyNodes(deps, {initParent: true}));
    }

    if (boms && boms.length > 0) {
        const depMgmtNode: ElementNode | undefined = projectNode.children && projectNode.children.find(node => node.tag === XmlTagName.DependencyManagement);
        if (depMgmtNode !== undefined) {
            const depsNodes: ElementNode | undefined = depMgmtNode.children && depMgmtNode.children.find(node => node.tag === XmlTagName.Dependencies);
            if (depsNodes !== undefined) {
                await updateWorkspaceEdit(edit, pomPath, depsNodes, new BOMNodes(boms));
            } else {
                await updateWorkspaceEdit(edit, pomPath, depMgmtNode, new BOMNodes(boms, {parents: ["dependencies"]}));
            }
        } else {
            await updateWorkspaceEdit(edit, pomPath, projectNode, new BOMNodes(boms, {parents: ["dependencies", "dependencyManagement"]}));
        }
    }

    vscode.workspace.applyEdit(edit);
}

async function getActiveProjectNode() {
    if (!vscode.window.activeTextEditor) {
        throw new UserError("No POM file is open.");
    }

    // Find out <dependencies> node and insert content.
    const content = vscode.window.activeTextEditor.document.getText();
    const projectNodes: ElementNode[] = getNodesByTag(content, XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    return projectNodes[0];
}

function constructNodeText(nodeToInsert: PomNode, baseIndent: string, indent: string, eol: string): string {
    const lines: string[] = nodeToInsert.getTextLines(indent);
    return ["", ...lines].join(`${eol}${baseIndent}${indent}`) + eol;
}

async function updateWorkspaceEdit(edit: vscode.WorkspaceEdit, pomPath: string, parentNode: ElementNode, nodeToInsert: PomNode): Promise<vscode.WorkspaceEdit> {
    if (parentNode.contentStart === undefined || parentNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to insert dependency.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, parentNode.contentEnd);
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces ? " ".repeat(options.tabSize as number) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";

    let insertPos: vscode.Position = currentDocument.positionAt(parentNode.contentEnd);
    // Not to mess up indentation, move cursor to line start:
    // <tab><tab>|</dependencies>  =>  |<tab><whitespace></dependencies>
    const insPosLineStart: vscode.Position = new vscode.Position(insertPos.line, 0);
    const contentBefore: string = currentDocument.getText(new vscode.Range(insPosLineStart, insertPos));
    if (contentBefore.trim() === "") {
        insertPos = insPosLineStart;
    }

    const targetText: string = constructNodeText(nodeToInsert, baseIndent, indent, eol);

    edit.insert(currentDocument.uri, insertPos, targetText);
    return edit;
}

function getIndentation(document: vscode.TextDocument, offset: number): string {
    const closingTagPosition: vscode.Position = document.positionAt(offset);
    return document.getText(new vscode.Range(
        new vscode.Position(closingTagPosition.line, 0),
        closingTagPosition
    ));
}

interface IArtifact {
    groupId: string;
    artifactId: string;
    version?: string;
    scope?: string;
}

interface IBom {
    groupId: string;
    artifactId: string;
    version: string;
    scope?: string;
    type?: string;
}

abstract class PomNode {
    protected static wrapWithParentNode(lines: string[], indent: string, parent: string) {
        return [
            `<${parent}>`,
            ...lines.map(line => `${indent}${line}`),
            `</${parent}>`,
        ];
    }

    public abstract getTextLines(indent: string): string[];
}

class DependencyNodes extends PomNode {
    constructor(private artifacts: IArtifact[], private options?: { initParent?: boolean }) {
        super();
    }

    public getTextLines(indent: string): string[] {
        const listOfLines: string[] = [].concat(...this.artifacts.map(artifact => this.toTextLine(artifact, indent)));
        if (this.options && this.options.initParent) {
            return PomNode.wrapWithParentNode(listOfLines, indent, "dependencies");
        } else {
            return listOfLines;
        }
    }

    private toTextLine(artifact: IArtifact, indent: string): string[] {
        const { groupId, artifactId, version, scope } = artifact;
        const lines: string[] = [
            `<groupId>${groupId}</groupId>`,
            `<artifactId>${artifactId}</artifactId>`,
            version && `<version>${version}</version>`,
            scope && scope !== "compile" && `<scope>${scope}</scope>`,
        ].filter(Boolean);
        return PomNode.wrapWithParentNode(lines, indent, "dependency");
    }
}

class BOMNodes extends PomNode {
    constructor(private boms: IBom[], private options?: { parents?: string[] }) { super(); }

    public getTextLines(indent: string): string[] {
        const listOfLines: string[][] = this.boms.map(bom => this.bomToTextLine(bom, indent));
        let lines: string[] = [].concat(...listOfLines);
        if (this.options && this.options.parents && this.options.parents.length > 0) {
            for (const parent of this.options.parents) {
                lines = PomNode.wrapWithParentNode(lines, indent, parent);
            }
        }
        return lines;
    }

    private bomToTextLine(bom: IBom, indent: string): string[] {
        const { groupId, artifactId, version } = bom;
        const lines: string[] = [
            `<groupId>${groupId}</groupId>`,
            `<artifactId>${artifactId}</artifactId>`,
            `<version>${version}</version>`,
            `<type>pom</type>`,
            `<scope>import</scope>`,
        ];
        return PomNode.wrapWithParentNode(lines, indent, "dependency");
    }

}
