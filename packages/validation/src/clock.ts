/** Represents the timestamp components returned by the validation clock. */
interface ClockInstant {
  /** Counts whole seconds since the Unix epoch. */
  seconds: bigint;
  /** Stores the sub-second nanosecond adjustment. */
  nanos: number;
}

/** Supplies clock instants to temporal validators and permits deterministic test overrides. */
export const ValidationClock = {
  /** Returns the instant produced by the configured clock source.
   * @returns Current epoch seconds and nanosecond adjustment.
   */
  read(): ClockInstant {
    return clock();
  },
  /** Sets the clock source used by subsequent temporal validations.
   * @param replacement Optional clock source; omitting it restores the system clock.
   */
  set(replacement?: () => ClockInstant): void {
    clock = replacement ?? ValidationClock.system;
  },
  /** Reads the current system time as Protobuf timestamp components.
   * @returns Current epoch seconds and nanosecond adjustment.
   */
  system(): ClockInstant {
    const milliseconds = BigInt(Date.now());
    const seconds = milliseconds >= 0n ? milliseconds / 1000n : (milliseconds - 999n) / 1000n;
    return { seconds, nanos: Number((milliseconds - seconds * 1000n) * 1_000_000n) };
  },
};

let clock: () => ClockInstant = ValidationClock.system;
