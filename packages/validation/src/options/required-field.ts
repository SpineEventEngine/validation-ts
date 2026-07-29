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

type Requirement = { readonly field?: DescField; readonly oneof?: DescOneof };

function requireDefaultMessage(): string | undefined {
  return getOption(RequireOptionSchema, default_message);
}

function invalidOption(schema: DescMessage): never {
  throw new ValidationConfigurationError({
    code: "INVALID_OPTION_VALUE",
    option: "require",
    typeName: schema.typeName,
  });
}

/** Parses the documented OR-of-AND grammar, resolving every token eagerly. */
function parseRequirements(
  expression: string,
  schema: DescMessage,
): readonly (readonly Requirement[])[] {
  if (!expression.trim() || /[()]/.test(expression)) invalidOption(schema);

  const groups = expression.split("|").map((group) => group.trim());
  if (groups.some((group) => !group)) invalidOption(schema);

  return groups.map((group) => {
    const tokens = group.split("&").map((token) => token.trim());
    if (tokens.some((token) => !token || /\s/.test(token))) invalidOption(schema);
    return tokens.map((token) => resolveRequirement(token, schema));
  });
}

function resolveRequirement(token: string, schema: DescMessage): Requirement {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) invalidOption(schema);

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
}

function requirementIsPresent(requirement: Requirement, message: Message): boolean {
  if (requirement.field !== undefined) {
    return Presence.is(requirement.field, MessageFields.read(message, requirement.field));
  }
  return Presence.isOneof(requirement.oneof as DescOneof, message);
}

/** Validates a `(require)` option once for the message validation entry. */
export function validateRequireOption(
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
  const groups = parseRequirements(expression, schema);
  if (
    groups.some((group) => group.every((requirement) => requirementIsPresent(requirement, message)))
  ) {
    return;
  }

  violations.push(
    ViolationFactory.create(context, undefined, undefined, {
      customMessage: require.errorMsg,
      defaultMessage: requireDefaultMessage(),
      placeholders: { "require.fields": expression },
    }),
  );
}
