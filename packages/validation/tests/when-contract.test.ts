import { create } from "@bufbuild/protobuf";
import { vi } from "vitest";

import { ValidationClock } from "../src/clock.js";
import { validate } from "../src/index.js";
import {
  InvalidWhenValueSchema,
  NestedWhenEnvelopeSchema,
  TimeValidationSchema,
} from "./generated/test-when_pb.js";

describe("(when) collection and temporal contract", () => {
  afterEach(() => ValidationClock.set());

  it("skips singular descriptor defaults but evaluates default list and map elements once", () => {
    let reads = 0;
    ValidationClock.set(() => {
      reads++;
      return { seconds: 1_704_067_200n, nanos: 0 };
    });
    const defaults = create(TimeValidationSchema);
    expect(validate(TimeValidationSchema, defaults)).toEqual([]);
    expect(reads).toBe(0);
    expect(
      validate(TimeValidationSchema, create(TimeValidationSchema, { futureTimestamp: {} })),
    ).toEqual([]);
    expect(reads).toBe(0);
    const values = create(TimeValidationSchema, {
      pastTimestamp: { seconds: 1n },
      futureTimestamps: [{ seconds: 0n }],
      pastTimestampByName: { default: { seconds: 0n } },
    });
    expect(validate(TimeValidationSchema, values)).toHaveLength(1);
    expect(reads).toBe(3);
  });

  it("rejects unknown Time enum numbers with the public configuration shape", () => {
    expect(() =>
      validate(InvalidWhenValueSchema, create(InvalidWhenValueSchema, { value: { seconds: 1n } })),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_OPTION_VALUE",
        option: "when",
        typeName: "tests.InvalidWhenValue",
        fieldPath: ["value"],
      }),
    );
  });

  it("reads the clock once per scalar and collection element", () => {
    let reads = 0;
    ValidationClock.set(() => ({ seconds: (reads++, 1_704_067_200n), nanos: 0 }));
    expect(
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, { pastTimestamp: { seconds: 1n } }),
      ),
    ).toEqual([]);
    expect(reads).toBe(1);
    reads = 0;
    expect(
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, {
          futureTimestamps: [{ seconds: 1n }, { seconds: 2n }],
          pastTimestampByName: { one: { seconds: 1n } },
        }),
      ),
    ).toHaveLength(2);
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
    let failures = 0;
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
        failures++;
        expect(error).toBeInstanceOf(RangeError);
        expect((error as Error).message).toBe("Invalid zoned date-time");
        expect((error as Error).message).not.toContain(zone);
        expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
        expect(String(error)).not.toContain(zone);
      }
    }
    expect(failures).toBe(2);
  });

  it("rejects otherwise-valid Spine years outside the JVM Timestamp instant range", () => {
    const zoned = (year: number) =>
      create(TimeValidationSchema, {
        pastZonedDateTime: {
          dateTime: { date: { year, month: 7, day: 1 }, time: { hour: 12 } },
          zone: { value: "America/New_York" },
        },
      });
    expect(() => validate(TimeValidationSchema, zoned(-999_999_999))).toThrow(RangeError);
    expect(() => validate(TimeValidationSchema, zoned(999_999_999))).toThrow(RangeError);
  });

  it("accepts JVM Timestamp bounds and rejects seconds outside them", () => {
    ValidationClock.set(() => ({ seconds: 0n, nanos: 0 }));
    expect(
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, {
          pastTimestamp: { seconds: -62_135_596_800n },
          futureTimestamp: { seconds: 253_402_300_799n, nanos: 999_999_999 },
        }),
      ),
    ).toEqual([]);
    expect(() =>
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, { pastTimestamp: { seconds: -62_135_596_801n } }),
      ),
    ).toThrow(RangeError);
    expect(() =>
      validate(
        TimeValidationSchema,
        create(TimeValidationSchema, { futureTimestamp: { seconds: 253_402_300_800n } }),
      ),
    ).toThrow(RangeError);
  });

  it("uses Euclidean pre-epoch system clock division", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(-1);
    try {
      ValidationClock.set();
      expect(
        validate(
          TimeValidationSchema,
          create(TimeValidationSchema, { pastTimestamp: { seconds: -1n, nanos: 999_000_000 } }),
        ),
      ).toEqual([]);
    } finally {
      now.mockRestore();
    }
  });

  it("keeps when and nested validation leaf-only in validator order", () => {
    ValidationClock.set(() => ({ seconds: 1_704_067_200n, nanos: 0 }));
    const message = create(NestedWhenEnvelopeSchema, {
      firstFuture: { seconds: 1n },
      nested: { future: { seconds: 1_800_000_000n }, label: "" },
    });
    expect(validate(NestedWhenEnvelopeSchema, message).map((v) => v.fieldPath?.fieldName)).toEqual([
      ["first_future"],
      ["nested", "label"],
    ]);
  });
});
