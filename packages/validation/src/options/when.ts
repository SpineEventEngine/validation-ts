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
  /** Adds a violation when a temporal value is not in its required past or future.
   * @param context Root type and path carried into created violations.
   * @param schema Descriptor used to report invalid `(when)` declarations.
   * @param message Candidate message supplying temporal values.
   * @param field Temporal field declaring `(when)`.
   * @param violations Mutable collection receiving temporal diagnostics.
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

  /** Flattens a temporal field value into values that must each satisfy `(when)`.
   * @param field Descriptor that distinguishes scalar, list, and map handling.
   * @param value Runtime field value from the candidate message.
   * @returns Individual temporal values to compare with the clock.
   */
  collectionValues(field: DescField, value: unknown): unknown[] {
    if (field.fieldKind === "list") return Array.isArray(value) ? value : [];
    if (field.fieldKind === "map")
      return value && typeof value === "object" ? Object.values(value) : [];
    return [value];
  },

  /** Obtains the message type name carried by a temporal field.
   * @param field Field descriptor to inspect.
   * @returns The temporal message type name, or an empty string for other fields.
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

  /** Converts a supported temporal message to an epoch-nanosecond instant.
   * @param value Runtime temporal message to convert.
   * @param typeName Declared temporal message type; omitted for a clock timestamp.
   * @returns The validated instant in epoch nanoseconds.
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

  /** Converts a Protobuf timestamp after checking its nanosecond component.
   * @param value Timestamp-shaped runtime value.
   * @returns The timestamp as a valid epoch-nanosecond instant.
   */
  checkedTimestamp(value: unknown): bigint {
    const timestamp = When.object(value);
    const seconds = When.bigint(timestamp.seconds);
    const nanos = When.integer(timestamp.nanos);
    if (nanos < 0 || nanos >= 1_000_000_000)
      throw new RangeError("Timestamp nanos must be within 0..999999999");
    return When.checkedEpoch(seconds * NANOSECONDS_PER_SECOND + BigInt(nanos));
  },

  /** Checks that an epoch instant fits the Protobuf timestamp range.
   * @param epoch Candidate epoch-nanosecond instant.
   * @returns The same instant after range validation.
   */
  checkedEpoch(epoch: bigint): bigint {
    if (
      epoch < TIMESTAMP_MIN_SECONDS * NANOSECONDS_PER_SECOND ||
      epoch > TIMESTAMP_MAX_SECONDS * NANOSECONDS_PER_SECOND + 999_999_999n
    )
      throw new RangeError("Timestamp is outside the valid range");
    return epoch;
  },

  /** Converts a Spine local date-time value to an epoch-nanosecond instant.
   * @param value Local date-time record containing date and time components.
   * @returns The corresponding UTC epoch-nanosecond instant.
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

  /** Converts checked local date-time components to an epoch-nanosecond instant.
   * @param yearValue Calendar year component.
   * @param monthValue One-based calendar month component.
   * @param dayValue Day within the supplied month.
   * @param hourValue Hour within the day.
   * @param minuteValue Minute within the hour.
   * @param secondValue Second within the minute.
   * @param nanoValue Nanosecond within the second.
   * @returns The corresponding UTC epoch-nanosecond instant.
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

  /** Converts a Spine zoned date-time through its named IANA time zone.
   * @param value Zoned date-time record containing local date-time and zone.
   * @returns The resolved epoch-nanosecond instant.
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

  /** Counts days from the Unix epoch for a Gregorian calendar date.
   * @param year Gregorian calendar year.
   * @param month One-based Gregorian calendar month.
   * @param day Day within the supplied month.
   * @returns Whole days from 1970-01-01 to the date.
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
  /** Calculates the number of days in a Gregorian calendar month.
   * @param year Gregorian calendar year, used for leap-year handling.
   * @param month One-based Gregorian calendar month.
   * @returns The number of days in the specified month.
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
  /** Requires a temporal component to be an object record.
   * @param value Runtime temporal component to normalize.
   * @returns The component as an object record, or an empty record for `undefined`.
   */
  object(value: unknown): Record<string, unknown> {
    if (value === undefined) return {};
    if (!value || typeof value !== "object") throw new RangeError("Missing temporal value");
    return value as Record<string, unknown>;
  },
  /** Converts a temporal component to an integer.
   * @param value Runtime temporal component to convert.
   * @returns The converted integer component.
   */
  integer(value: unknown): number {
    const result = Number(value ?? 0);
    if (!Number.isInteger(result)) throw new RangeError("Expected an integer temporal component");
    return result;
  },
  /** Converts timestamp seconds to a bigint.
   * @param value Runtime timestamp-seconds component.
   * @returns The converted bigint seconds value.
   */
  bigint(value: unknown): bigint {
    try {
      return BigInt(value as bigint | number | string);
    } catch {
      throw new RangeError("Expected timestamp seconds");
    }
  },
  /** Rejects a `(when)` message template that uses an unsupported placeholder.
   * @param template Custom error-message template to inspect.
   * @param schema Descriptor used to locate a configuration error.
   * @param field Field declaring the invalid template.
   */
  assertPlaceholders(template: string, schema: DescMessage, field: DescField): void {
    for (const [, key] of template.matchAll(/\$\{([^}]+)\}/g))
      if (!allowedPlaceholders.has(key))
        throw When.configurationError("INVALID_OPTION_VALUE", schema, field);
  },
  /** Creates a location-aware configuration error for a `(when)` declaration.
   * @param code Configuration failure classification.
   * @param schema Descriptor containing the invalid option.
   * @param field Field declaring the invalid option.
   * @returns A structured error ready to throw.
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
