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

import { create, equals, ScalarType } from "@bufbuild/protobuf";
import type { DescField, DescOneof, Message } from "@bufbuild/protobuf";
import { MessageFields } from "./validation-contract.js";

/** Determines whether descriptor values count as present for validation options. */
export const Presence = {
  /** Identifies field kinds whose default values can be distinguished from presence.
   * @param field Field descriptor to inspect.
   * @returns Whether the field supports presence-aware validation.
   */
  supports(field: DescField): boolean {
    return (
      field.fieldKind === "message" ||
      field.fieldKind === "enum" ||
      field.fieldKind === "list" ||
      field.fieldKind === "map" ||
      (field.fieldKind === "scalar" &&
        (field.scalar === ScalarType.STRING || field.scalar === ScalarType.BYTES))
    );
  },

  /** Determines whether a field value is present rather than its Protobuf default.
   * @param field Descriptor defining the value's field kind.
   * @param value Runtime field value to evaluate.
   * @returns Whether the value is present according to its field kind.
   */
  is(field: DescField, value: unknown): boolean {
    if (field.fieldKind === "message") {
      return (
        value !== undefined &&
        value !== null &&
        !equals(field.message, value as never, create(field.message))
      );
    }
    if (field.fieldKind === "enum") return typeof value === "number" && value !== 0;
    if (field.fieldKind === "list") return Array.isArray(value) && value.length > 0;
    if (field.fieldKind === "map")
      return !!value && typeof value === "object" && Object.keys(value).length > 0;
    if (field.scalar === ScalarType.STRING) return typeof value === "string" && value.length > 0;
    return value instanceof Uint8Array && value.length > 0;
  },

  /** Determines whether a oneof currently selects a member.
   * @param oneof Oneof descriptor to inspect.
   * @param message Message containing the oneof value.
   * @returns Whether the message selects a oneof member.
   */
  isOneof(oneof: DescOneof, message: Message): boolean {
    const value = MessageFields.read(message, oneof);
    return (
      typeof value === "object" && value !== null && "case" in value && value.case !== undefined
    );
  },
};
