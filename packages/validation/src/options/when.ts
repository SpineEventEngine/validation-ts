import { getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";
import { Temporal } from "temporal-polyfill";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { default_message } from "../generated/spine/options_pb.js";
import { Time, TimeOptionSchema, when } from "../generated/spine/time_options_pb.js";
import { readValidationNow } from "../clock.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";
import {
  createConstraintViolation,
  readField,
  type ValidationContext,
} from "../validation-contract.js";

const NANOSECONDS_PER_SECOND = 1_000_000_000n;
const allowedPlaceholders = new Set([
  "field.path",
  "field.value",
  "field.type",
  "parent.type",
  "when.in",
]);
const supportedTypes = new Set([
  "google.protobuf.Timestamp",
  "spine.time.YearMonth",
  "spine.time.LocalDate",
  "spine.time.LocalDateTime",
  "spine.time.OffsetDateTime",
  "spine.time.ZonedDateTime",
]);

/** Validates immutable Spine Time `(when)` declarations in field-validator order. */
export function validateWhenField(
  context: ValidationContext,
  schema: DescMessage,
  message: Message,
  field: DescField,
  violations: ConstraintViolation[],
): void {
  if (!hasOption(field, when)) return;
  const option = getOption(field, when);
  if (option.in === Time.TIME_UNDEFINED) return;
  const typeName = temporalType(field);
  if (!supportedTypes.has(typeName))
    throw configurationError("UNSUPPORTED_OPTION_TARGET", schema, field);
  assertPlaceholders(option.errorMsg, schema, field);
  const value = readField(message, field);
  if (
    (field.fieldKind === "message" || field.fieldKind === "list" || field.fieldKind === "map") &&
    value === undefined
  )
    return;
  const values = collectionValues(field, value);
  for (const element of values) {
    const now = toEpochNanoseconds(readValidationNow());
    const instant = toEpochNanoseconds(element, typeName);
    const valid = option.in === Time.PAST ? instant <= now : instant >= now;
    if (valid) continue;
    violations.push(
      createConstraintViolation(context.atField(field), field, element, {
        customMessage: option.errorMsg || undefined,
        defaultMessage: getOption(TimeOptionSchema, default_message) || undefined,
        placeholders: { "when.in": option.in === Time.PAST ? "past" : "future" },
      }),
    );
  }
}

function collectionValues(field: DescField, value: unknown): unknown[] {
  if (field.fieldKind === "list") return Array.isArray(value) ? value : [];
  if (field.fieldKind === "map")
    return value && typeof value === "object" ? Object.values(value) : [];
  return [value];
}

function temporalType(field: DescField): string {
  if (
    field.fieldKind === "message" ||
    (field.fieldKind === "list" && field.listKind === "message") ||
    (field.fieldKind === "map" && field.mapKind === "message")
  )
    return field.message.typeName;
  return "";
}

function toEpochNanoseconds(value: unknown, typeName?: string): bigint {
  if (!typeName) return checkedTimestamp(value);
  const temporal = value as Record<string, unknown>;
  switch (typeName) {
    case "google.protobuf.Timestamp":
      return checkedTimestamp(temporal);
    case "spine.time.YearMonth":
      return localDateEpoch(temporal.year, temporal.month, 1, 0, 0, 0, 0);
    case "spine.time.LocalDate":
      return localDateEpoch(temporal.year, temporal.month, temporal.day, 0, 0, 0, 0);
    case "spine.time.LocalDateTime":
      return localDateTimeEpoch(temporal);
    case "spine.time.OffsetDateTime": {
      const dateTime = object(temporal.dateTime);
      const offset = object(temporal.offset);
      return (
        localDateTimeEpoch(dateTime) -
        BigInt(integer(offset.amountSeconds)) * NANOSECONDS_PER_SECOND
      );
    }
    case "spine.time.ZonedDateTime":
      return zonedDateTimeEpoch(temporal);
    default:
      throw new RangeError(`Unsupported temporal value ${typeName}`);
  }
}

function checkedTimestamp(value: unknown): bigint {
  const timestamp = object(value);
  const seconds = bigint(timestamp.seconds);
  const nanos = integer(timestamp.nanos);
  if (nanos < 0 || nanos >= 1_000_000_000)
    throw new RangeError("Timestamp nanos must be within 0..999999999");
  return seconds * NANOSECONDS_PER_SECOND + BigInt(nanos);
}

function localDateTimeEpoch(value: Record<string, unknown>): bigint {
  const date = object(value.date);
  const time = object(value.time);
  return localDateEpoch(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    time.second,
    time.nano,
  );
}

function localDateEpoch(
  yearValue: unknown,
  monthValue: unknown,
  dayValue: unknown,
  hourValue: unknown,
  minuteValue: unknown,
  secondValue: unknown,
  nanoValue: unknown,
): bigint {
  const year = integer(yearValue);
  const month = integer(monthValue);
  const day = integer(dayValue);
  const hour = integer(hourValue);
  const minute = integer(minuteValue);
  const second = integer(secondValue);
  const nano = integer(nanoValue);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    nano < 0 ||
    nano >= 1_000_000_000
  )
    throw new RangeError("Invalid local date-time");
  return (
    (daysFromCivil(year, month, day) * 86_400n + BigInt(hour * 3600 + minute * 60 + second)) *
      NANOSECONDS_PER_SECOND +
    BigInt(nano)
  );
}

function zonedDateTimeEpoch(value: Record<string, unknown>): bigint {
  const date = object(object(value.dateTime).date);
  const time = object(object(value.dateTime).time);
  const zone = String(object(value.zone).value ?? "");
  try {
    return Temporal.ZonedDateTime.from(
      {
        timeZone: zone,
        year: integer(date.year),
        month: integer(date.month),
        day: integer(date.day),
        hour: integer(time.hour),
        minute: integer(time.minute),
        second: integer(time.second),
        millisecond: 0,
        microsecond: 0,
        nanosecond: integer(time.nano),
      },
      { disambiguation: "compatible" },
    ).epochNanoseconds;
  } catch (cause) {
    throw new RangeError("Invalid zoned date-time", { cause });
  }
}

function daysFromCivil(year: number, month: number, day: number): bigint {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear >= 0 ? adjustedYear / 400 : (adjustedYear - 399) / 400);
  const yoe = adjustedYear - era * 400;
  const mp = month + (month > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return BigInt(era * 146097 + doe - 719468);
}
function daysInMonth(year: number, month: number): number {
  return month === 2
    ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
      ? 29
      : 28
    : [4, 6, 9, 11].includes(month)
      ? 30
      : 31;
}
function object(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object") throw new RangeError("Missing temporal value");
  return value as Record<string, unknown>;
}
function integer(value: unknown): number {
  const result = Number(value ?? 0);
  if (!Number.isInteger(result)) throw new RangeError("Expected an integer temporal component");
  return result;
}
function bigint(value: unknown): bigint {
  try {
    return BigInt(value as bigint | number | string);
  } catch {
    throw new RangeError("Expected timestamp seconds");
  }
}
function assertPlaceholders(template: string, schema: DescMessage, field: DescField): void {
  for (const [, key] of template.matchAll(/\$\{([^}]+)\}/g))
    if (!allowedPlaceholders.has(key))
      throw configurationError("INVALID_OPTION_VALUE", schema, field);
}
function configurationError(
  code: "UNSUPPORTED_OPTION_TARGET" | "INVALID_OPTION_VALUE",
  schema: DescMessage,
  field: DescField,
): ValidationConfigurationError {
  return new ValidationConfigurationError({
    code,
    option: "when",
    typeName: schema.typeName,
    fieldPath: [field.name],
  });
}
