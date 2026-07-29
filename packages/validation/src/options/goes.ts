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

/** Validation of the descriptor-defined `(goes)` option. */

import { getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { default_message, GoesOptionSchema } from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { Presence } from "../presence.js";
import { ViolationFactory, MessageFields, type ValidationContext } from "../validation-contract.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";

function defaultMessage(): string | undefined {
  return getOption(GoesOptionSchema, default_message);
}

/** Validates one `(goes)` field, including declaration errors before value checks. */
export function validateGoesField(
  context: ValidationContext,
  schema: DescMessage,
  message: Message,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const goesOption = ValidationOptions.get("goes");
  if (!goesOption || !hasOption(field, goesOption)) return;

  if (!Presence.supports(field)) {
    throw new ValidationConfigurationError({
      code: "UNSUPPORTED_OPTION_TARGET",
      option: "goes",
      typeName: schema.typeName,
      fieldPath: [field.name],
    });
  }

  const option = getOption(field, goesOption);
  if (!option.with) {
    throw new ValidationConfigurationError({
      code: "INVALID_OPTION_VALUE",
      option: "goes",
      typeName: schema.typeName,
      fieldPath: [field.name],
    });
  }

  const companion = schema.fields.find((candidate) => candidate.name === option.with);
  if (companion === undefined) {
    throw new ValidationConfigurationError({
      code: "UNKNOWN_FIELD_REFERENCE",
      option: "goes",
      typeName: schema.typeName,
      fieldPath: [field.name],
    });
  }
  if (!Presence.supports(companion)) {
    throw new ValidationConfigurationError({
      code: "INVALID_FIELD_REFERENCE",
      option: "goes",
      typeName: schema.typeName,
      fieldPath: [companion.name],
    });
  }

  const value = MessageFields.read(message, field);
  if (!Presence.is(field, value) || Presence.is(companion, MessageFields.read(message, companion)))
    return;

  violations.push(
    ViolationFactory.create(context.atField(field), field, value, {
      customMessage: option.errorMsg,
      defaultMessage: defaultMessage(),
      placeholders: { "goes.companion": companion.name },
    }),
  );
}
