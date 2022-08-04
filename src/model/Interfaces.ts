// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// Overview API
export interface IDependency extends IValue {
    group?: string;
    versionRange?: string;
    _links?: ILinks;
}

export interface ILinks {
    // Count of starters by link types for Spring Boot v2.7.2: {reference: 95, guide: 39, home: 1, other: 1, sample: 7}
    reference?: ILink;
    guide?: ILink;
    home?: ILink;
    other?: ILink;
    sample?: ILink;
}

export interface ILink {
    href: string;
    title?: string;
    templated?: boolean;
}

export interface ITopLevelAttribute {
    // tslint:disable-next-line:no-reserved-keywords
    type: AttributeType;
    // tslint:disable-next-line:no-reserved-keywords
    default?: any;
    values?: IValue[];
}

export interface IValue {
    id?: string;
    name?: string;
    description?: string;
    values?: IValue[];
}

export enum AttributeType {
    text = "text", // defines a simple text value with no option.
    single = "single-select", // defines a simple value to be chosen amongst the specified options.
    multi = "hierarchical-multi-select", // defines a hierarchical set of values (values in values) with the ability to select multiple values.
    action = "action", // a special type that defines the attribute defining the action to use.
}

// Dependencies API
export interface IMavenId {
    groupId: string;
    artifactId: string;
    version?: string;
    scope?: string;
    bom?: string;
    repository?: string;
}

export interface IRepository {
    name: string;
    url: string;
    snapshotEnabled: boolean;
}

export interface IBom {
    groupId: string;
    artifactId: string;
    version: string;
    repositories: string[];
}

export interface IStarters {
    bootVersion: string;
    dependencies: { [id: string]: IMavenId };
    repositories: { [id: string]: IRepository };
    boms: { [id: string]: IBom };
}

// xml2js.explicitArray: true
export interface XmlNode { [key: string]: XmlNode[] | string[]; }

export interface IDependencyNode extends XmlNode {
    groupId: string[];
    artifactId: string[];
    version?: string[];
    scope?: string[];
}

export interface IBomNode extends XmlNode {
    groupId: string[];
    artifactId: string[];
    version: string[];
    // tslint:disable-next-line:no-reserved-keywords
    type: ["pom"];
    scope: ["import"];
}

export interface IRepositoryNode extends XmlNode {
    id: string[];
    name: string[];
    url: string[];
    snapshots: [
        {
            enabled: [BooleanString];
        }
    ];
}

export enum BooleanString {
    TRUE = "true",
    FALSE = "false",
}
