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

/** Validation of the message-level `(require)` option. */

import { getExtension, getOption, hasExtension } from "@bufbuild/protobuf";
import type { DescField, DescMessage, DescOneof, Message } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { default_message, RequireOptionSchema } from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { Presence } from "../presence.js";
import { ViolationFactory, MessageFields, type ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

/** Describes the purpose of the `Requirement` member. */
interface Requirement {
  /** Identifies the required field when the expression names a field. */
  readonly field?: DescField;
  /** Identifies the required oneof when the expression names a oneof. */
  readonly oneof?: DescOneof;
}

/** Owns `(require)` option parsing and validation. */
export const Require = {
  /** Processes inputs for `validate`.
   * @param context Supplies the context input.
   * @param schema Supplies the schema input.
   * @param message Supplies the message input.
   * @param violations Supplies the violations input.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    violations: ConstraintViolation[],
  ): void {
    const requireOption = ValidationOptions.get("requireFields");
    const options = schema.proto.options;
    if (!options || !hasExtension(options, requireOption)) return;

    const require = getExtension(options, requireOption);
    const expression = require.fields;
    const groups = Require.parseRequirements(expression, schema);
    if (
      groups.some((group) =>
        group.every((requirement) => Require.requirementIsPresent(requirement, message)),
      )
    ) {
      return;
    }

    violations.push(
      ViolationFactory.create(context, undefined, undefined, {
        customMessage: require.errorMsg,
        defaultMessage: Require.defaultMessage(),
        placeholders: { "require.fields": expression },
      }),
    );
  },

  /** Processes inputs for `defaultMessage`.
   * @returns Returns the computed result.
   */
  defaultMessage(): string | undefined {
    return getOption(RequireOptionSchema, default_message);
  },

  /** Processes inputs for `invalidOption`.
   * @param schema Supplies the schema input.
   */
  invalidOption(schema: DescMessage): never {
    throw new ValidationConfigurationError({
      code: "INVALID_OPTION_VALUE",
      option: "require",
      typeName: schema.typeName,
    });
  },

  /** Processes inputs for `parseRequirements`.
   * @param expression Supplies the expression input.
   * @param schema Supplies the schema input.
   * @returns Returns the computed result.
   */
  parseRequirements(expression: string, schema: DescMessage): readonly (readonly Requirement[])[] {
    if (!expression.trim() || /[()]/.test(expression)) Require.invalidOption(schema);

    const groups = expression.split("|").map((group) => group.trim());
    if (groups.some((group) => !group)) Require.invalidOption(schema);

    return groups.map((group) => {
      const tokens = group.split("&").map((token) => token.trim());
      if (tokens.some((token) => !token || /\s/.test(token))) Require.invalidOption(schema);
      return tokens.map((token) => Require.resolve(token, schema));
    });
  },

  /** Processes inputs for `resolve`.
   * @param token Supplies the token input.
   * @param schema Supplies the schema input.
   * @returns Returns the computed result.
   */
  resolve(token: string, schema: DescMessage): Requirement {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) Require.invalidOption(schema);

    const field = schema.fields.find((candidate) => candidate.name === token);
    if (field !== undefined) {
      if (!Presence.supports(field)) {
        throw new ValidationConfigurationError({
          code: "INVALID_FIELD_REFERENCE",
          option: "require",
          typeName: schema.typeName,
          fieldPath: [field.name],
        });
      }
      return { field };
    }

    const oneof = schema.oneofs.find((candidate) => candidate.name === token);
    if (oneof !== undefined) return { oneof };

    throw new ValidationConfigurationError({
      code: "UNKNOWN_FIELD_REFERENCE",
      option: "require",
      typeName: schema.typeName,
      fieldPath: [token],
    });
  },

  /** Processes inputs for `requirementIsPresent`.
   * @param requirement Supplies the requirement input.
   * @param message Supplies the message input.
   * @returns Returns the computed result.
   */
  requirementIsPresent(requirement: Requirement, message: Message): boolean {
    if (requirement.field !== undefined) {
      return Presence.is(requirement.field, MessageFields.read(message, requirement.field));
    }
    return Presence.isOneof(requirement.oneof as DescOneof, message);
  },
} as const;
