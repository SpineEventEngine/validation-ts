/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Stable codes for invalid validation-option declarations. */
/** Describes the purpose of the `ValidationConfigurationErrorCode` member. */
export type ValidationConfigurationErrorCode =
  | "UNSUPPORTED_OPTION_TARGET"
  | "INVALID_OPTION_VALUE"
  | "UNKNOWN_FIELD_REFERENCE"
  | "INVALID_FIELD_REFERENCE";

/** Data exposed by a validation configuration error. */
/** Describes the purpose of the `ValidationConfigurationErrorInit` member. */
export interface ValidationConfigurationErrorInit {
  /** Describes the purpose of the `code` member. */
  code: ValidationConfigurationErrorCode;
  /** Describes the purpose of the `option` member. */
  option: string;
  /** Describes the purpose of the `typeName` member. */
  typeName: string;
  /** Describes the purpose of the `fieldPath` member. */
  fieldPath?: readonly string[];
  /** Describes the purpose of the `cause` member. */
  cause?: unknown;
}

/**
 * Indicates that a validation option cannot be applied as declared.
 *
 * The `option` value is the canonical option name without Proto parentheses.
 */
/** Describes the purpose of the `ValidationConfigurationError` member. */
export class ValidationConfigurationError extends Error {
  /** Describes the purpose of the `code` member. */
  readonly code: ValidationConfigurationErrorCode;
  /** Describes the purpose of the `option` member. */
  readonly option: string;
  /** Describes the purpose of the `typeName` member. */
  readonly typeName: string;
  /** Describes the purpose of the `fieldPath` member. */
  readonly fieldPath?: readonly string[];
  /** Describes the purpose of the `cause` member. */
  readonly cause?: unknown;

  /** Creates an error that identifies an invalid validation-option declaration.
   * @param init Structured location and classification of the invalid declaration.
   */
  constructor(init: ValidationConfigurationErrorInit) {
    super(
      `Invalid ${init.option} validation configuration for ${init.typeName}` +
        (init.fieldPath?.length ? ` at ${init.fieldPath.join(".")}` : ""),
    );
    this.name = "ValidationConfigurationError";
    this.code = init.code;
    this.option = init.option;
    this.typeName = init.typeName;
    this.fieldPath = init.fieldPath;
    this.cause = init.cause;
  }
}
