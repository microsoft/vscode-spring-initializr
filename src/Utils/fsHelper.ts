// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { FileType, Uri, workspace } from "vscode";

export async function isDirectory(uri: Uri): Promise<boolean | undefined> {
  try {
    return (await workspace.fs.stat(uri)).type === FileType.Directory;
  } catch (error) {
    return undefined;
  }
}

export async function pathExists(uri: Uri): Promise<boolean> {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch (error) {
    return false;
  }
}
