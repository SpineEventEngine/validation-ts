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

import { create, ScalarType } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";
import {
  anyPack,
  BoolValueSchema,
  BytesValueSchema,
  DoubleValueSchema,
  FloatValueSchema,
  Int32ValueSchema,
  Int64ValueSchema,
  StringValueSchema,
  UInt32ValueSchema,
  UInt64ValueSchema,
} from "@bufbuild/protobuf/wkt";

import { FieldPathSchema } from "./generated/spine/base/field_path_pb.js";
import {
  ConstraintViolationSchema,
  type ConstraintViolation,
} from "./generated/spine/validate/validation_error_pb.js";
import { TemplateStringSchema } from "./generated/spine/validate/error_message_pb.js";

/** Shared root entry and current Proto-field path for validation. */
/** Describes the purpose of the `ValidationContext` member. */
export class ValidationContext {
  /** Describes the purpose of the `rootTypeName` member. */
  readonly rootTypeName: string;
  /** Describes the purpose of the `fieldPath` member. */
  readonly fieldPath: readonly string[];

  /** Processes inputs for `member`.
   * @param rootTypeName Supplies the rootTypeName input.
   * @param fieldPath Supplies the fieldPath input.
   * @returns Returns the computed result.
   */
  constructor(rootTypeName: string, fieldPath: readonly string[] = []) {
    this.rootTypeName = rootTypeName;
    this.fieldPath = fieldPath;
  }

  /** Creates the root context for a message descriptor. */
  /** Processes inputs for `create`.
   * @param schema Supplies the schema input.
   * @returns Returns the computed result.
   */
  static create(schema: DescMessage): ValidationContext {
    return new ValidationContext(schema.typeName);
  }

  /** Extends the current path with one unqualified Proto field name. */
  /** Processes inputs for `atField`.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  atField(field: DescField): ValidationContext {
    return new ValidationContext(this.rootTypeName, [...this.fieldPath, field.name]);
  }
}

/** Reads one descriptor-named field from a generated message at the reflective seam. */
/** Describes the purpose of the `MessageFields` member. */
export const MessageFields = {
  /** Processes inputs for `read`.
   * @param message Supplies the message input.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  read(message: Message, field: Pick<DescField, "localName">): unknown {
    return (message as unknown as Record<string, unknown>)[field.localName];
  },
};

/** Inputs for a violation's present `TemplateString`. */
/** Describes the purpose of the `ViolationMessage` member. */
export interface ViolationMessage {
  /** Describes the purpose of the `customMessage` member. */
  customMessage?: string;
  /** Describes the purpose of the `defaultMessage` member. */
  defaultMessage?: string;
  /** Describes the purpose of the `placeholders` member. */
  placeholders?: Readonly<Record<string, string>>;
}

/** Creates shared violation envelopes from descriptor-aware field values. */
export const ViolationFactory = {
  /** Processes inputs for `create`.
   * @param context Supplies the context input.
   * @param field Supplies the field input.
   * @param fieldValue Supplies the fieldValue input.
   * @param message Supplies the message input.
   * @returns Returns the computed result.
   */
  create(
    context: ValidationContext,
    field: DescField | undefined,
    fieldValue: unknown,
    message: ViolationMessage,
  ): ConstraintViolation {
    const hasFieldValue = field !== undefined && fieldValue !== undefined;
    const placeholderValue: Record<string, string> = {
      "message.type": context.rootTypeName,
    };

    if (field !== undefined) {
      Object.assign(placeholderValue, {
        "parent.type": context.rootTypeName,
        "field.path": context.fieldPath.join("."),
        "field.type": ViolationFactory.fieldTypeName(field),
      });
    }

    if (hasFieldValue) {
      placeholderValue["field.value"] = ViolationFactory.formatFieldValue(fieldValue);
    }

    return create(ConstraintViolationSchema, {
      typeName: context.rootTypeName,
      fieldPath: create(FieldPathSchema, {
        fieldName: [...context.fieldPath],
      }),
      fieldValue: hasFieldValue ? ViolationFactory.packFieldValue(field, fieldValue) : undefined,
      message: create(TemplateStringSchema, {
        withPlaceholders: message.customMessage || message.defaultMessage || "",
        placeholderValue: {
          ...placeholderValue,
          ...message.placeholders,
        },
      }),
    });
  },

  /** Processes inputs for `packFieldValue`.
   * @param field Supplies the field input.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  packFieldValue(field: DescField, value: unknown) {
    if (field.fieldKind === "message") return ViolationFactory.packMessage(field.message, value);
    if (field.fieldKind === "enum") return ViolationFactory.packWrapper(Int32ValueSchema, value);
    if (field.fieldKind === "scalar") return ViolationFactory.packScalar(field.scalar, value);
    if (field.fieldKind === "list") {
      if (field.listKind === "message") return ViolationFactory.packMessage(field.message, value);
      if (field.listKind === "enum") return ViolationFactory.packWrapper(Int32ValueSchema, value);
      return ViolationFactory.packScalar(field.scalar, value);
    }
    if (field.mapKind === "message") return ViolationFactory.packMessage(field.message, value);
    if (field.mapKind === "enum") return ViolationFactory.packWrapper(Int32ValueSchema, value);
    return ViolationFactory.packScalar(field.scalar, value);
  },

  /** Processes inputs for `packScalar`.
   * @param scalar Supplies the scalar input.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  packScalar(scalar: ScalarType, value: unknown) {
    switch (scalar) {
      case ScalarType.DOUBLE:
        return ViolationFactory.packWrapper(DoubleValueSchema, value);
      case ScalarType.FLOAT:
        return ViolationFactory.packWrapper(FloatValueSchema, value);
      case ScalarType.INT64:
      case ScalarType.SINT64:
      case ScalarType.SFIXED64:
        return ViolationFactory.packWrapper(Int64ValueSchema, value);
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        return ViolationFactory.packWrapper(UInt64ValueSchema, value);
      case ScalarType.INT32:
      case ScalarType.SINT32:
      case ScalarType.SFIXED32:
        return ViolationFactory.packWrapper(Int32ValueSchema, value);
      case ScalarType.UINT32:
      case ScalarType.FIXED32:
        return ViolationFactory.packWrapper(UInt32ValueSchema, value);
      case ScalarType.BOOL:
        return ViolationFactory.packWrapper(BoolValueSchema, value);
      case ScalarType.BYTES:
        return ViolationFactory.packWrapper(BytesValueSchema, value);
      case ScalarType.STRING:
        return ViolationFactory.packWrapper(StringValueSchema, value);
    }
  },

  /** Processes inputs for `packWrapper`.
   * @param schema Supplies the schema input.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  packWrapper(schema: DescMessage, value: unknown) {
    return anyPack(schema, create(schema, { value }));
  },

  /** Processes inputs for `packMessage`.
   * @param schema Supplies the schema input.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  packMessage(schema: DescMessage, value: unknown) {
    return anyPack(schema, value as never);
  },

  /** Processes inputs for `fieldTypeName`.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  fieldTypeName(field: DescField): string {
    if (field.fieldKind === "message") return field.message.typeName;
    if (field.fieldKind === "enum") return field.enum.typeName;
    if (field.fieldKind === "scalar") return ViolationFactory.scalarProtoTypeName(field.scalar);
    if (field.fieldKind === "list") {
      if (field.listKind === "message") return field.message.typeName;
      if (field.listKind === "enum") return field.enum.typeName;
      return ViolationFactory.scalarProtoTypeName(field.scalar);
    }
    if (field.mapKind === "message") return field.message.typeName;
    if (field.mapKind === "enum") return field.enum.typeName;
    return ViolationFactory.scalarProtoTypeName(field.scalar);
  },

  /** Processes inputs for `scalarProtoTypeName`.
   * @param scalar Supplies the scalar input.
   * @returns Returns the computed result.
   */
  scalarProtoTypeName(scalar: ScalarType): string {
    switch (scalar) {
      case ScalarType.DOUBLE:
        return "double";
      case ScalarType.FLOAT:
        return "float";
      case ScalarType.INT64:
        return "int64";
      case ScalarType.UINT64:
        return "uint64";
      case ScalarType.INT32:
        return "int32";
      case ScalarType.FIXED64:
        return "fixed64";
      case ScalarType.FIXED32:
        return "fixed32";
      case ScalarType.BOOL:
        return "bool";
      case ScalarType.STRING:
        return "string";
      case ScalarType.BYTES:
        return "bytes";
      case ScalarType.UINT32:
        return "uint32";
      case ScalarType.SFIXED32:
        return "sfixed32";
      case ScalarType.SFIXED64:
        return "sfixed64";
      case ScalarType.SINT32:
        return "sint32";
      case ScalarType.SINT64:
        return "sint64";
    }
  },

  /** Processes inputs for `formatFieldValue`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  formatFieldValue(value: unknown): string {
    if (value instanceof Uint8Array) {
      return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, (_, nested) =>
        typeof nested === "bigint" ? nested.toString() : nested,
      );
    }
    return String(value);
  },
} as const;
