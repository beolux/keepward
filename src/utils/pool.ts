/** Lightweight object pool */
export class Pool<T> {
  private free: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, prewarm = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prewarm; i++) this.free.push(factory());
  }

  acquire(): T {
    return this.free.pop() ?? this.factory();
  }

  release(item: T): void {
    this.reset(item);
    this.free.push(item);
  }
}
