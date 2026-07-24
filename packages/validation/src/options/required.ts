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

/** Validation of the descriptor-defined `(required)` field option. */

import { getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb";
import { default_message, IfMissingOptionSchema } from "../generated/spine/options_pb";
import { getRegisteredOption } from "../options-registry";
import { isPresent, supportsPresence } from "../presence";
import { createConstraintViolation, type ValidationContext } from "../validation-contract";
import { ValidationConfigurationError } from "../validation-configuration-error";

function defaultMessage(): string | undefined {
  return getOption(IfMissingOptionSchema, default_message);
}

/** Validates one field, allowing orchestration to preserve declaration order. */
export function validateRequiredField(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  const requiredOption = getRegisteredOption("required");
  if (!requiredOption || !hasOption(field, requiredOption) || !getOption(field, requiredOption))
    return;

  if (!supportsPresence(field)) {
    throw new ValidationConfigurationError({
      code: "UNSUPPORTED_OPTION_TARGET",
      option: "required",
      typeName: schema.typeName,
      fieldPath: [field.name],
    });
  }

  const value = message[field.localName];
  if (isPresent(field, value)) return;

  const ifMissingOption = getRegisteredOption("if_missing");
  const ifMissing =
    ifMissingOption && hasOption(field, ifMissingOption)
      ? getOption(field, ifMissingOption)
      : undefined;
  const customMessage =
    ifMissing && typeof ifMissing === "object" && "errorMsg" in ifMissing
      ? (ifMissing.errorMsg as string)
      : undefined;

  violations.push(
    createConstraintViolation(context.atField(field), field, undefined, {
      customMessage,
      defaultMessage: defaultMessage(),
    }),
  );
}
