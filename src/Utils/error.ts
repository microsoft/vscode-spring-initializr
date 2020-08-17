// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { setUserError } from "vscode-extension-telemetry-wrapper";

export class UserError extends Error {
  constructor(msg?: string) {
    super(msg);
    setUserError(this);
  }
}
