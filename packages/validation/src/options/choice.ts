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

/** Validation of the descriptor-defined oneof `(choice)` option. */

import { getOption, hasOption } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb";
import { ChoiceOptionSchema, default_message } from "../generated/spine/options_pb";
import { getRegisteredOption } from "../options-registry";
import { isOneofPresent } from "../presence";
import { createConstraintViolation, type ValidationContext } from "../validation-contract";

function defaultMessage(): string | undefined {
  return getOption(ChoiceOptionSchema, default_message);
}

/** Validates required oneof groups in descriptor order. */
export function validateChoiceOptions(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  violations: ConstraintViolation[],
): void {
  const choiceOption = getRegisteredOption("choice");
  if (!choiceOption) return;

  for (const oneof of schema.oneofs) {
    if (!hasOption(oneof, choiceOption)) continue;
    const option = getOption(oneof, choiceOption) as { required: boolean; errorMsg: string };
    if (!option.required || isOneofPresent(oneof, message)) continue;

    violations.push(
      createConstraintViolation(context, undefined, undefined, {
        customMessage: option.errorMsg,
        defaultMessage: defaultMessage(),
        placeholders: { "group.path": oneof.name, "parent.type": context.rootTypeName },
      }),
    );
  }
}
