declare global {
  interface Array<T> {
    findLast(
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ): T | undefined
    findLastIndex(
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ): number
  }

  interface ReadonlyArray<T> {
    findLast(
      predicate: (value: T, index: number, array: readonly T[]) => unknown,
      thisArg?: unknown,
    ): T | undefined
    findLastIndex(
      predicate: (value: T, index: number, array: readonly T[]) => unknown,
      thisArg?: unknown,
    ): number
  }
}

if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    value<T>(
      this: T[],
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ) {
      for (let index = this.length - 1; index >= 0; index -= 1) {
        const value = this[index]

        if (predicate.call(thisArg, value, index, this)) {
          return value
        }
      }

      return undefined
    },
    configurable: true,
    writable: true,
  })
}

if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    value<T>(
      this: T[],
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: unknown,
    ) {
      for (let index = this.length - 1; index >= 0; index -= 1) {
        const value = this[index]

        if (predicate.call(thisArg, value, index, this)) {
          return index
        }
      }

      return -1
    },
    configurable: true,
    writable: true,
  })
}

export {}
