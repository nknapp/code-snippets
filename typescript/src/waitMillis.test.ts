import { waitMillis } from "./waitMillis";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";

describe("waitMillis", () => {
  let clock: InstalledClock;

  beforeEach(() => {
    clock = FakeTimers.install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it("waits a period of time", async () => {
    const callback = vi.fn();
    waitMillis(1000).then(callback);

    await clock.tickAsync(999);
    expect(callback).not.toHaveBeenCalled();
    await clock.tickAsync(2);
    expect(callback).toHaveBeenCalled();
  });

  it("can be canceled with an abort signal", async () => {
    const abortController = new AbortController();

    const callback = vi.fn();
    waitMillis(1000, abortController.signal).then(callback);

    await clock.tickAsync(500);
    expect(callback).not.toHaveBeenCalled();
    abortController.abort();

    await clock.tickAsync(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
