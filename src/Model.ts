// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface IDependency {
    id: string;
    name?: string;
    group?: string;
    description?: string;
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
}

export enum AttributeType {
    text = "text", // defines a simple text value with no option.
    single = "single-select", // defines a simple value to be chosen amongst the specified options.
    multi = "hierarchical-multi-select", // defines a hierarchical set of values (values in values) with the ability to select multiple values.
    action = "action" // a special type that defines the attribute defining the action to use.
}
