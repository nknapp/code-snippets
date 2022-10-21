export function createEmitter<T extends unknown[]>() {
  type Listener = (...args: T) => void;
  const listeners: Listener[] = [];
  return {
    emit(...args: T): void {
      for (const listener of listeners) {
        listener(...args);
      }
    },
    addListener(listener: Listener): void {
      listeners.push(listener);
    },
  };
}
