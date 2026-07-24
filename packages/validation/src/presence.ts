import { create, equals, ScalarType } from "@bufbuild/protobuf";
import type { DescField, DescOneof } from "@bufbuild/protobuf";

export function supportsPresence(field: DescField): boolean {
  return (
    field.fieldKind === "message" ||
    field.fieldKind === "enum" ||
    field.fieldKind === "list" ||
    field.fieldKind === "map" ||
    (field.fieldKind === "scalar" &&
      (field.scalar === ScalarType.STRING || field.scalar === ScalarType.BYTES))
  );
}

export function isPresent(field: DescField, value: unknown): boolean {
  if (field.fieldKind === "message") {
    return (
      value !== undefined &&
      value !== null &&
      !equals(field.message, value as never, create(field.message))
    );
  }
  if (field.fieldKind === "enum") return value !== 0;
  if (field.fieldKind === "list") return Array.isArray(value) && value.length > 0;
  if (field.fieldKind === "map")
    return !!value && typeof value === "object" && Object.keys(value).length > 0;
  if (field.scalar === ScalarType.STRING) return typeof value === "string" && value.length > 0;
  return value instanceof Uint8Array && value.length > 0;
}

export function isOneofPresent(oneof: DescOneof, message: Record<string, unknown>): boolean {
  return (message[oneof.localName] as { case?: string } | undefined)?.case !== undefined;
}
