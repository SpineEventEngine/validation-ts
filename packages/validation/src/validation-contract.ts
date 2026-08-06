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

/** Carries a validation root type and the Proto field path currently being evaluated. */
export class ValidationContext {
  /** Fully qualified name of the message where validation began. */
  readonly rootTypeName: string;
  /** Proto field names from the root message to the current location. */
  readonly fieldPath: readonly string[];

  /** Creates a context for a root message and its current nested field path.
   * @param rootTypeName Fully qualified type name of the root message.
   * @param fieldPath Proto field names from the root to the current location.
   */
  constructor(rootTypeName: string, fieldPath: readonly string[] = []) {
    this.rootTypeName = rootTypeName;
    this.fieldPath = fieldPath;
  }

  /** Creates the empty-path context for a root message descriptor.
   * @param schema Descriptor whose type name identifies the root message.
   * @returns A context rooted at `schema`.
   */
  static create(schema: DescMessage): ValidationContext {
    return new ValidationContext(schema.typeName);
  }

  /** Extends this context with one descriptor field.
   * @param field Field whose Proto name is appended to the path.
   * @returns A new context for `field`.
   */
  atField(field: DescField): ValidationContext {
    return new ValidationContext(this.rootTypeName, [...this.fieldPath, field.name]);
  }
}

/** Reads descriptor-named properties from generated message instances. */
export const MessageFields = {
  /** Reads a generated message property identified by its descriptor local name.
   * @param message Generated message to inspect.
   * @param field Descriptor view containing the generated property name.
   * @returns The field's runtime value.
   */
  read(message: Message, field: Pick<DescField, "localName">): unknown {
    return (message as unknown as Record<string, unknown>)[field.localName];
  },
};

/** Supplies the message template and substitutions for a created violation. */
export interface ViolationMessage {
  /** Option-specific message that takes precedence when it is nonempty. */
  customMessage?: string;
  /** Built-in option message used when no custom message is supplied. */
  defaultMessage?: string;
  /** Additional placeholder values merged into the generated diagnostic. */
  placeholders?: Readonly<Record<string, string>>;
}

/** Creates shared violation envelopes from descriptor-aware field values. */
export const ViolationFactory = {
  /** Builds a descriptor-packed violation with resolved message placeholders.
   * @param context Root type and field path of the failure.
   * @param field Failing field, when the failure is field-scoped.
   * @param fieldValue Runtime value that failed validation.
   * @param message Custom, default, and placeholder message content.
   * @returns The normalized constraint violation.
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

  /** Packs a field value into the appropriate `Any` representation.
   * @param field Descriptor selecting the packing strategy.
   * @param value Runtime field value to pack.
   * @returns The packed field value.
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

  /** Packs a scalar into its matching Protobuf wrapper message.
   * @param scalar Scalar type selecting the wrapper schema.
   * @param value Runtime scalar value to pack.
   * @returns The scalar wrapper packed in `Any`.
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

  /** Creates and packs a scalar wrapper message.
   * @param schema Wrapper message schema.
   * @param value Scalar value assigned to the wrapper.
   * @returns The packed wrapper message.
   */
  packWrapper(schema: DescMessage, value: unknown) {
    return anyPack(schema, create(schema, { value }));
  },

  /** Packs a message-valued field without changing its shape.
   * @param schema Message schema for the value.
   * @param value Runtime message value to pack.
   * @returns The packed message.
   */
  packMessage(schema: DescMessage, value: unknown) {
    return anyPack(schema, value as never);
  },

  /** Derives the Protobuf type name displayed for a field.
   * @param field Descriptor whose field kind is inspected.
   * @returns A message, enum, or scalar Protobuf type name.
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

  /** Maps a scalar enum value to its Protobuf spelling.
   * @param scalar Scalar type to render.
   * @returns The canonical Protobuf scalar name.
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

  /** Renders a field value for a diagnostic placeholder.
   * @param value Runtime field value to render.
   * @returns A string representation that preserves bytes and bigint values.
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
