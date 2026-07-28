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
export class ValidationContext {
  readonly rootTypeName: string;
  readonly fieldPath: readonly string[];

  constructor(rootTypeName: string, fieldPath: readonly string[] = []) {
    this.rootTypeName = rootTypeName;
    this.fieldPath = fieldPath;
  }

  /** Extends the current path with one unqualified Proto field name. */
  atField(field: DescField): ValidationContext {
    return new ValidationContext(this.rootTypeName, [...this.fieldPath, field.name]);
  }
}

/** Creates a root validation context for one validation entry point. */
export function createValidationContext(schema: DescMessage): ValidationContext {
  return new ValidationContext(schema.typeName);
}

/** Reads one descriptor-named field from a generated message at the reflective seam. */
export function readField(message: Message, field: Pick<DescField, "localName">): unknown {
  return (message as unknown as Record<string, unknown>)[field.localName];
}

/** Inputs for a violation's present `TemplateString`. */
export interface ViolationMessage {
  customMessage?: string;
  defaultMessage?: string;
  placeholders?: Readonly<Record<string, string>>;
}

/** Creates a shared violation envelope from a descriptor-aware field value. */
export function createConstraintViolation(
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
      "field.type": fieldTypeName(field),
    });
  }

  if (hasFieldValue) {
    placeholderValue["field.value"] = formatFieldValue(fieldValue);
  }

  return create(ConstraintViolationSchema, {
    typeName: context.rootTypeName,
    fieldPath: create(FieldPathSchema, {
      fieldName: [...context.fieldPath],
    }),
    fieldValue: hasFieldValue ? packFieldValue(field, fieldValue) : undefined,
    message: create(TemplateStringSchema, {
      withPlaceholders: message.customMessage || message.defaultMessage || "",
      placeholderValue: {
        ...placeholderValue,
        ...message.placeholders,
      },
    }),
  });
}

function packFieldValue(field: DescField, value: unknown) {
  if (field.fieldKind === "message") return packMessage(field.message, value);
  if (field.fieldKind === "enum") return packWrapper(Int32ValueSchema, value);
  if (field.fieldKind === "scalar") return packScalar(field.scalar, value);
  if (field.fieldKind === "list") {
    if (field.listKind === "message") return packMessage(field.message, value);
    if (field.listKind === "enum") return packWrapper(Int32ValueSchema, value);
    return packScalar(field.scalar, value);
  }
  if (field.mapKind === "message") return packMessage(field.message, value);
  if (field.mapKind === "enum") return packWrapper(Int32ValueSchema, value);
  return packScalar(field.scalar, value);
}

function packScalar(scalar: ScalarType, value: unknown) {
  switch (scalar) {
    case ScalarType.DOUBLE:
      return packWrapper(DoubleValueSchema, value);
    case ScalarType.FLOAT:
      return packWrapper(FloatValueSchema, value);
    case ScalarType.INT64:
    case ScalarType.SINT64:
    case ScalarType.SFIXED64:
      return packWrapper(Int64ValueSchema, value);
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return packWrapper(UInt64ValueSchema, value);
    case ScalarType.INT32:
    case ScalarType.SINT32:
    case ScalarType.SFIXED32:
      return packWrapper(Int32ValueSchema, value);
    case ScalarType.UINT32:
    case ScalarType.FIXED32:
      return packWrapper(UInt32ValueSchema, value);
    case ScalarType.BOOL:
      return packWrapper(BoolValueSchema, value);
    case ScalarType.BYTES:
      return packWrapper(BytesValueSchema, value);
    case ScalarType.STRING:
      return packWrapper(StringValueSchema, value);
  }
}

function packWrapper(schema: DescMessage, value: unknown) {
  return anyPack(schema, create(schema, { value }));
}

function packMessage(schema: DescMessage, value: unknown) {
  return anyPack(schema, value as never);
}

function fieldTypeName(field: DescField): string {
  if (field.fieldKind === "message") return field.message.typeName;
  if (field.fieldKind === "enum") return field.enum.typeName;
  if (field.fieldKind === "scalar") return scalarProtoTypeName(field.scalar);
  if (field.fieldKind === "list") {
    if (field.listKind === "message") return field.message.typeName;
    if (field.listKind === "enum") return field.enum.typeName;
    return scalarProtoTypeName(field.scalar);
  }
  if (field.mapKind === "message") return field.message.typeName;
  if (field.mapKind === "enum") return field.enum.typeName;
  return scalarProtoTypeName(field.scalar);
}

function scalarProtoTypeName(scalar: ScalarType): string {
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
}

function formatFieldValue(value: unknown): string {
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
}
