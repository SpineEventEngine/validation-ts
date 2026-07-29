/** Represents the timestamp components returned by the validation clock. */
interface ClockInstant {
  /** Counts whole seconds since the Unix epoch. */
  seconds: bigint;
  /** Stores the sub-second nanosecond adjustment. */
  nanos: number;
}

/** Internal deterministic clock seam. Production reads the system clock. */
/** Describes the purpose of the `ValidationClock` member. */
export const ValidationClock = {
  /** Processes inputs for `read`.
   * @returns Returns the computed result.
   */
  read(): ClockInstant {
    return clock();
  },
  /** Processes inputs for `set`.
   * @param replacement Supplies the replacement input.
   */
  set(replacement?: () => ClockInstant): void {
    clock = replacement ?? ValidationClock.system;
  },
  /** Processes inputs for `system`.
   * @returns Returns the computed result.
   */
  system(): ClockInstant {
    const milliseconds = BigInt(Date.now());
    const seconds = milliseconds >= 0n ? milliseconds / 1000n : (milliseconds - 999n) / 1000n;
    return { seconds, nanos: Number((milliseconds - seconds * 1000n) * 1_000_000n) };
  },
};

let clock: () => ClockInstant = ValidationClock.system;
