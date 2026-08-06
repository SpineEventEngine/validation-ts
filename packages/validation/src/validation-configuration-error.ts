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

/** Classifies why a validation option declaration cannot be applied. */
export type ValidationConfigurationErrorCode =
  | "UNSUPPORTED_OPTION_TARGET"
  | "INVALID_OPTION_VALUE"
  | "UNKNOWN_FIELD_REFERENCE"
  | "INVALID_FIELD_REFERENCE";

/** Identifies the invalid option declaration used to create a configuration error. */
export interface ValidationConfigurationErrorInit {
  /** Classification of the invalid declaration. */
  code: ValidationConfigurationErrorCode;
  /** Canonical validation option name without Proto parentheses. */
  option: string;
  /** Fully qualified Proto type declaring the option. */
  typeName: string;
  /** Optional Proto field-name path locating the option declaration. */
  fieldPath?: readonly string[];
  /** Underlying reason supplied by option parsing or resolution. */
  cause?: unknown;
}

/**
 * Indicates that a validation option cannot be applied as declared.
 *
 * The `option` value is the canonical option name without Proto parentheses.
 */
export class ValidationConfigurationError extends Error {
  /** Classification of the invalid declaration. */
  readonly code: ValidationConfigurationErrorCode;
  /** Canonical validation option name without Proto parentheses. */
  readonly option: string;
  /** Fully qualified Proto type declaring the option. */
  readonly typeName: string;
  /** Optional Proto field-name path locating the option declaration. */
  readonly fieldPath?: readonly string[];
  /** Underlying reason supplied by option parsing or resolution. */
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
