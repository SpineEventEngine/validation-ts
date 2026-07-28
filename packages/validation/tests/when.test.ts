import { create } from "@bufbuild/protobuf";
import { anyUnpack } from "@bufbuild/protobuf/wkt";

import { setValidationClockForTesting } from "../src/clock.js";
import { validate } from "../src/index.js";
import { TimeValidationSchema, UnsupportedWhenTargetSchema } from "./generated/test-when_pb.js";
import { TimestampSchema } from "@bufbuild/protobuf/wkt";

const now = { seconds: 1_704_067_200n, nanos: 0 }; // 2024-01-01T00:00:00Z

describe("(when) time validation", () => {
  beforeEach(() => setValidationClockForTesting(() => now));
  afterEach(() => setValidationClockForTesting());

  it("treats equality with now as valid for both bounds and disables TIME_UNDEFINED", () => {
    const message = create(TimeValidationSchema, {
      pastTimestamp: now,
      futureTimestamp: now,
      disabled: { seconds: 0n, nanos: 0 },
    });
    expect(validate(TimeValidationSchema, message)).toEqual([]);
  });

  it("reports repeated and map offenders on the collection field with the element value", () => {
    const message = create(TimeValidationSchema, {
      futureTimestamps: [{ seconds: 0n }, { seconds: 1_800_000_000n }, { seconds: 1n }],
      pastTimestampByName: {
        first: { seconds: 1_800_000_000n },
        second: { seconds: 0n },
      },
    });
    const violations = validate(TimeValidationSchema, message);
    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      ["future_timestamps"],
      ["future_timestamps"],
      ["past_timestamp_by_name"],
    ]);
    expect(
      violations.map((violation) => anyUnpack(violation.fieldValue!, TimestampSchema)?.seconds),
    ).toEqual([0n, 1n, 1_800_000_000n]);
  });

  it("converts all supported temporal values using UTC or explicit-offset semantics", () => {
    const message = temporalMessage({
      pastTimestamp: { seconds: 0n },
      futureTimestamp: { seconds: 0n },
      pastYearMonth: { year: 2025, month: 1 },
      futureDate: { year: 2020, month: 1, day: 1 },
      pastDateTime: { date: { year: 2025, month: 1, day: 1 } },
      futureOffsetDateTime: { dateTime: { date: { year: 2020, month: 1, day: 1 } } },
    });
    expect(
      validate(TimeValidationSchema, message).map((violation) => violation.fieldPath?.fieldName[0]),
    ).toEqual([
      "future_timestamp",
      "past_year_month",
      "future_date",
      "past_date_time",
      "future_offset_date_time",
    ]);
  });

  it("resolves New York 2024 compatible gap and overlap like Java", () => {
    setValidationClockForTesting(() => ({ seconds: 1_735_689_600n, nanos: 0 })); // 2025-01-01T00:00:00Z
    const gap = temporalMessage({
      pastZonedDateTime: {
        dateTime: { date: { year: 2024, month: 3, day: 10 }, time: { hour: 2, minute: 30 } },
        zone: { value: "America/New_York" },
      },
    });
    const overlap = temporalMessage({
      pastZonedDateTime: {
        dateTime: { date: { year: 2024, month: 11, day: 3 }, time: { hour: 1, minute: 30 } },
        zone: { value: "America/New_York" },
      },
    });
    expect(validate(TimeValidationSchema, gap)).toEqual([]);
    expect(validate(TimeValidationSchema, overlap)).toEqual([]);
  });

  it("uses error_msg over the default message and supplies the documented when.in placeholder", () => {
    const violations = validate(
      TimeValidationSchema,
      temporalMessage({ customMessage: { seconds: 1_800_000_000n } }),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message?.withPlaceholders).toBe("custom ${when.in} ${field.path}");
    expect(violations[0].message?.placeholderValue["when.in"]).toBe("past");
  });

  it("rejects unsupported targets as a configuration error", () => {
    expect(() =>
      validate(UnsupportedWhenTargetSchema, create(UnsupportedWhenTargetSchema)),
    ).toThrow("Invalid when validation configuration");
  });

  it("throws for malformed timestamp and zoned temporal values", () => {
    expect(() =>
      validate(TimeValidationSchema, temporalMessage({ pastTimestamp: { nanos: -1 } })),
    ).toThrow(RangeError);
    expect(() =>
      validate(
        TimeValidationSchema,
        temporalMessage({
          pastZonedDateTime: {
            dateTime: { date: { year: 2024, month: 1, day: 1 } },
            zone: { value: "No/Such_Zone" },
          },
        }),
      ),
    ).toThrow(RangeError);
  });

  it("uses the system clock after test injection is reset", () => {
    setValidationClockForTesting();
    expect(
      validate(TimeValidationSchema, temporalMessage({ pastTimestamp: { seconds: 0n } })),
    ).toEqual([]);
  });

  it("checks Gregorian leap-day components", () => {
    expect(
      validate(
        TimeValidationSchema,
        temporalMessage({ futureDate: { year: 2024, month: 2, day: 29 } }),
      ),
    ).toEqual([]);
    expect(() =>
      validate(
        TimeValidationSchema,
        temporalMessage({ futureDate: { year: 2023, month: 2, day: 29 } }),
      ),
    ).toThrow(RangeError);
  });
});

function temporalMessage(value: Record<string, unknown>) {
  return create(TimeValidationSchema, value as never);
}
