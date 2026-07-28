import { create } from "@bufbuild/protobuf";

import { setValidationClockForTesting } from "../src/clock.js";
import { validate } from "../src/index.js";
import { TimeValidationSchema } from "./generated/test-when_pb.js";

describe("(when) collection and temporal contract", () => {
  afterEach(() => setValidationClockForTesting());

  it("skips singular descriptor defaults but evaluates default list and map elements once", () => {
    let reads = 0;
    setValidationClockForTesting(() => {
      reads++;
      return { seconds: 1_704_067_200n, nanos: 0 };
    });
    const defaults = create(TimeValidationSchema);
    expect(validate(TimeValidationSchema, defaults)).toEqual([]);
    expect(reads).toBe(0);
    const values = create(TimeValidationSchema, {
      pastTimestamp: { seconds: 1n },
      futureTimestamps: [{ seconds: 0n }],
      pastTimestampByName: { default: { seconds: 0n } },
    });
    expect(validate(TimeValidationSchema, values)).toHaveLength(1);
    expect(reads).toBe(3);
  });

  it("rejects year and offset ranges and hides unsafe zone input", () => {
    expect(() =>
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, {
          futureDate: { year: 1_000_000_000, month: 1, day: 1 },
        }),
      ),
    ).toThrow(RangeError);
    expect(() =>
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, {
          futureOffsetDateTime: {
            dateTime: { date: { year: 2024, month: 1, day: 1 } },
            offset: { amountSeconds: 64_801 },
          },
        }),
      ),
    ).toThrow(RangeError);
    for (const zone of ["x".repeat(256), "America/New_York\nleak"]) {
      try {
        validate(
          TimeValidationSchema,
          create(TimeValidationSchema, {
            pastZonedDateTime: {
              dateTime: { date: { year: 2024, month: 1, day: 1 } },
              zone: { value: zone },
            },
          }),
        );
      } catch (error) {
        expect(error).toBeInstanceOf(RangeError);
        expect((error as Error).message).toBe("Invalid zoned date-time");
        expect((error as Error).message).not.toContain(zone);
      }
    }
  });

  it("projects extreme New York years with the historical-past and future rule bands", () => {
    const zoned = (year: number) =>
      create(TimeValidationSchema, {
        pastZonedDateTime: {
          dateTime: { date: { year, month: 7, day: 1 }, time: { hour: 12 } },
          zone: { value: "America/New_York" },
        },
      });
    setValidationClockForTesting(() => ({ seconds: -31_557_014_119_897_438n, nanos: 0 }));
    expect(validate(TimeValidationSchema, zoned(-999_999_999))).toEqual([]);
    setValidationClockForTesting(() => ({ seconds: 31_556_889_816_940_800n, nanos: 0 }));
    expect(validate(TimeValidationSchema, zoned(999_999_999))).toEqual([]);
  });

  it("converts BCE UTC and explicit offsets", () => {
    setValidationClockForTesting(() => ({ seconds: 0n, nanos: 0 }));
    const message = create(TimeValidationSchema, {
      pastDateTime: { date: { year: -1, month: 1, day: 1 } },
      futureOffsetDateTime: {
        dateTime: { date: { year: -1, month: 1, day: 1 } },
        offset: { amountSeconds: 0 },
      },
    });
    expect(validate(TimeValidationSchema, message).map((v) => v.fieldPath?.fieldName[0])).toEqual([
      "future_offset_date_time",
    ]);
  });
});
