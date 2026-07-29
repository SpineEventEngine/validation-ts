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
import type { DescMessage, Message } from "@bufbuild/protobuf";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { ChoiceOptionSchema, default_message } from "../generated/spine/options_pb.js";
import { ValidationOptions } from "../options-registry.js";
import { Presence } from "../presence.js";
import { ViolationFactory, type ValidationContext } from "../validation-contract.js";

/** Owns `(choice)` option validation. */
export const Choice = {
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
    const choiceOption = ValidationOptions.get("choice");
    if (!choiceOption) return;

    for (const oneof of schema.oneofs) {
      if (!hasOption(oneof, choiceOption)) continue;
      const option = getOption(oneof, choiceOption);
      if (!option.required || Presence.isOneof(oneof, message)) continue;

      violations.push(
        ViolationFactory.create(context, undefined, undefined, {
          customMessage: option.errorMsg,
          defaultMessage: Choice.defaultMessage(),
          placeholders: { "group.path": oneof.name, "parent.type": context.rootTypeName },
        }),
      );
    }
  },

  /** Processes inputs for `defaultMessage`.
   * @returns Returns the computed result.
   */
  defaultMessage(): string | undefined {
    return getOption(ChoiceOptionSchema, default_message);
  },
} as const;
