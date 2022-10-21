import { createEmitter } from "./createEmitter";

describe("the emitter", () => {
  it("sends functions calls to all listeners", () => {
    const { emit, addListener } = createEmitter<[value: number]>();
    const listener1 = vi.fn();
    addListener(listener1);
    const listener2 = vi.fn();
    addListener(listener2);

    emit(2);

    expect(listener1).toHaveBeenCalledWith(2);
    expect(listener2).toHaveBeenCalledWith(2);
  });
});
