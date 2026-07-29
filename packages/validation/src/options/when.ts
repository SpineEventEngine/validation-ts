import { create, equals, getOption, hasOption } from "@bufbuild/protobuf";
import type { DescField, DescMessage, Message } from "@bufbuild/protobuf";
import { Temporal } from "temporal-polyfill";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb.js";
import { default_message } from "../generated/spine/options_pb.js";
import { Time, TimeOptionSchema } from "../generated/spine/time_options_pb.js";
import { ValidationClock } from "../clock.js";
import { ValidationOptions } from "../options-registry.js";
import { ValidationConfigurationError } from "../validation-configuration-error.js";
import { ViolationFactory, MessageFields, type ValidationContext } from "../validation-contract.js";

const NANOSECONDS_PER_SECOND = 1_000_000_000n;
const MIN_YEAR = -999_999_999;
const MAX_YEAR = 999_999_999;
const TIMESTAMP_MIN_SECONDS = -62_135_596_800n;
const TIMESTAMP_MAX_SECONDS = 253_402_300_799n;
const ZONE_IDENTIFIER = /^(?:UTC|[A-Za-z0-9._+-]+(?:\/[A-Za-z0-9._+-]+)*)$/;
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

/** Owns immutable Spine Time `(when)` validation and temporal conversion helpers. */
export const When = {
  /** Validates immutable Spine Time `(when)` declarations in field-validator order. */
  /** Processes inputs for `validate`.
   * @param context Supplies the context input.
   * @param schema Supplies the schema input.
   * @param message Supplies the message input.
   * @param field Supplies the field input.
   * @param violations Supplies the violations input.
   */
  validate(
    context: ValidationContext,
    schema: DescMessage,
    message: Message,
    field: DescField,
    violations: ConstraintViolation[],
  ): void {
    const extension = ValidationOptions.get("when");
    if (!hasOption(field, extension)) return;
    const option = getOption(field, extension);
    if (option.in === Time.TIME_UNDEFINED) return;
    if (option.in !== Time.PAST && option.in !== Time.FUTURE)
      throw When.configurationError("INVALID_OPTION_VALUE", schema, field);
    const typeName = When.temporalType(field);
    if (!supportedTypes.has(typeName))
      throw When.configurationError("UNSUPPORTED_OPTION_TARGET", schema, field);
    When.assertPlaceholders(option.errorMsg, schema, field);
    const value = MessageFields.read(message, field);
    if (
      field.fieldKind === "message" &&
      (!value || equals(field.message, value as never, create(field.message)))
    )
      return;
    const values = When.collectionValues(field, value);
    for (const element of values) {
      const now = When.toEpochNanoseconds(ValidationClock.read());
      const instant = When.toEpochNanoseconds(element, typeName);
      const valid = option.in === Time.PAST ? instant <= now : instant >= now;
      if (valid) continue;
      violations.push(
        ViolationFactory.create(context.atField(field), field, element, {
          customMessage: option.errorMsg || undefined,
          defaultMessage: getOption(TimeOptionSchema, default_message) || undefined,
          placeholders: { "when.in": option.in === Time.PAST ? "past" : "future" },
        }),
      );
    }
  },

  /** Processes inputs for `collectionValues`.
   * @param field Supplies the field input.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  collectionValues(field: DescField, value: unknown): unknown[] {
    if (field.fieldKind === "list") return Array.isArray(value) ? value : [];
    if (field.fieldKind === "map")
      return value && typeof value === "object" ? Object.values(value) : [];
    return [value];
  },

  /** Processes inputs for `temporalType`.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  temporalType(field: DescField): string {
    if (
      field.fieldKind === "message" ||
      (field.fieldKind === "list" && field.listKind === "message") ||
      (field.fieldKind === "map" && field.mapKind === "message")
    )
      return field.message.typeName;
    return "";
  },

  /** Processes inputs for `toEpochNanoseconds`.
   * @param value Supplies the value input.
   * @param typeName Supplies the typeName input.
   * @returns Returns the computed result.
   */
  toEpochNanoseconds(value: unknown, typeName?: string): bigint {
    if (!typeName) return When.checkedTimestamp(value);
    const temporal = value as Record<string, unknown>;
    let epoch: bigint;
    switch (typeName) {
      case "google.protobuf.Timestamp":
        return When.checkedTimestamp(temporal);
      case "spine.time.YearMonth":
        epoch = When.localDateEpoch(temporal.year, temporal.month, 1, 0, 0, 0, 0);
        break;
      case "spine.time.LocalDate":
        epoch = When.localDateEpoch(temporal.year, temporal.month, temporal.day, 0, 0, 0, 0);
        break;
      case "spine.time.LocalDateTime":
        epoch = When.localDateTimeEpoch(temporal);
        break;
      case "spine.time.OffsetDateTime": {
        const dateTime = When.object(temporal.dateTime);
        const offset = When.object(temporal.offset);
        const seconds = When.integer(offset.amountSeconds);
        if (seconds < -64_800 || seconds > 64_800) throw new RangeError("Invalid offset");
        epoch = When.localDateTimeEpoch(dateTime) - BigInt(seconds) * NANOSECONDS_PER_SECOND;
        break;
      }
      case "spine.time.ZonedDateTime":
        epoch = When.zonedDateTimeEpoch(temporal);
        break;
      default:
        throw new RangeError(`Unsupported temporal value ${typeName}`);
    }
    return When.checkedEpoch(epoch);
  },

  /** Processes inputs for `checkedTimestamp`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  checkedTimestamp(value: unknown): bigint {
    const timestamp = When.object(value);
    const seconds = When.bigint(timestamp.seconds);
    const nanos = When.integer(timestamp.nanos);
    if (nanos < 0 || nanos >= 1_000_000_000)
      throw new RangeError("Timestamp nanos must be within 0..999999999");
    return When.checkedEpoch(seconds * NANOSECONDS_PER_SECOND + BigInt(nanos));
  },

  /** Processes inputs for `checkedEpoch`.
   * @param epoch Supplies the epoch input.
   * @returns Returns the computed result.
   */
  checkedEpoch(epoch: bigint): bigint {
    if (
      epoch < TIMESTAMP_MIN_SECONDS * NANOSECONDS_PER_SECOND ||
      epoch > TIMESTAMP_MAX_SECONDS * NANOSECONDS_PER_SECOND + 999_999_999n
    )
      throw new RangeError("Timestamp is outside the valid range");
    return epoch;
  },

  /** Processes inputs for `localDateTimeEpoch`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  localDateTimeEpoch(value: Record<string, unknown>): bigint {
    const date = When.object(value.date);
    const time = When.object(value.time);
    return When.localDateEpoch(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
      time.second,
      time.nano,
    );
  },

  /** Processes inputs for `localDateEpoch`.
   * @param yearValue Supplies the yearValue input.
   * @param monthValue Supplies the monthValue input.
   * @param dayValue Supplies the dayValue input.
   * @param hourValue Supplies the hourValue input.
   * @param minuteValue Supplies the minuteValue input.
   * @param secondValue Supplies the secondValue input.
   * @param nanoValue Supplies the nanoValue input.
   * @returns Returns the computed result.
   */
  localDateEpoch(
    yearValue: unknown,
    monthValue: unknown,
    dayValue: unknown,
    hourValue: unknown,
    minuteValue: unknown,
    secondValue: unknown,
    nanoValue: unknown,
  ): bigint {
    const year = When.integer(yearValue);
    const month = When.integer(monthValue);
    const day = When.integer(dayValue);
    const hour = When.integer(hourValue);
    const minute = When.integer(minuteValue);
    const second = When.integer(secondValue);
    const nano = When.integer(nanoValue);
    if (
      year < MIN_YEAR ||
      year > MAX_YEAR ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > When.daysInMonth(year, month) ||
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
      (When.daysFromCivil(year, month, day) * 86_400n +
        BigInt(hour * 3600 + minute * 60 + second)) *
        NANOSECONDS_PER_SECOND +
      BigInt(nano)
    );
  },

  /** Processes inputs for `zonedDateTimeEpoch`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  zonedDateTimeEpoch(value: Record<string, unknown>): bigint {
    const date = When.object(When.object(value.dateTime).date);
    const time = When.object(When.object(value.dateTime).time);
    const zone = String(When.object(value.zone).value ?? "");
    if (zone.length === 0 || zone.length > 255 || !ZONE_IDENTIFIER.test(zone))
      throw new RangeError("Invalid zoned date-time");
    try {
      return Temporal.ZonedDateTime.from(
        {
          timeZone: zone,
          year: When.integer(date.year),
          month: When.integer(date.month),
          day: When.integer(date.day),
          hour: When.integer(time.hour),
          minute: When.integer(time.minute),
          second: When.integer(time.second),
          millisecond: 0,
          microsecond: 0,
          nanosecond: When.integer(time.nano),
        },
        { disambiguation: "compatible" },
      ).epochNanoseconds;
    } catch {
      throw new RangeError("Invalid zoned date-time");
    }
  },

  /** Processes inputs for `daysFromCivil`.
   * @param year Supplies the year input.
   * @param month Supplies the month input.
   * @param day Supplies the day input.
   * @returns Returns the computed result.
   */
  daysFromCivil(year: number, month: number, day: number): bigint {
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yoe = adjustedYear - era * 400;
    const mp = month + (month > 2 ? -3 : 9);
    const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return BigInt(era * 146097 + doe - 719468);
  },
  /** Processes inputs for `daysInMonth`.
   * @param year Supplies the year input.
   * @param month Supplies the month input.
   * @returns Returns the computed result.
   */
  daysInMonth(year: number, month: number): number {
    return month === 2
      ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
        ? 29
        : 28
      : [4, 6, 9, 11].includes(month)
        ? 30
        : 31;
  },
  /** Processes inputs for `object`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  object(value: unknown): Record<string, unknown> {
    if (value === undefined) return {};
    if (!value || typeof value !== "object") throw new RangeError("Missing temporal value");
    return value as Record<string, unknown>;
  },
  /** Processes inputs for `integer`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  integer(value: unknown): number {
    const result = Number(value ?? 0);
    if (!Number.isInteger(result)) throw new RangeError("Expected an integer temporal component");
    return result;
  },
  /** Processes inputs for `bigint`.
   * @param value Supplies the value input.
   * @returns Returns the computed result.
   */
  bigint(value: unknown): bigint {
    try {
      return BigInt(value as bigint | number | string);
    } catch {
      throw new RangeError("Expected timestamp seconds");
    }
  },
  /** Processes inputs for `assertPlaceholders`.
   * @param template Supplies the template input.
   * @param schema Supplies the schema input.
   * @param field Supplies the field input.
   */
  assertPlaceholders(template: string, schema: DescMessage, field: DescField): void {
    for (const [, key] of template.matchAll(/\$\{([^}]+)\}/g))
      if (!allowedPlaceholders.has(key))
        throw When.configurationError("INVALID_OPTION_VALUE", schema, field);
  },
  /** Processes inputs for `configurationError`.
   * @param code Supplies the code input.
   * @param schema Supplies the schema input.
   * @param field Supplies the field input.
   * @returns Returns the computed result.
   */
  configurationError(
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
  },
} as const;
