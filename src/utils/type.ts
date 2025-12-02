// https://stackoverflow.com/questions/48215950/exclude-property-from-type
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export const tuple = <T extends string[]>(...args: T) => args

export const tupleNum = <T extends number[]>(...args: T) => args

export type LiteralUnion<T extends U, U> = T | (U & {});

export type ElementOf<T> = T extends (infer E)[] ? E : T extends readonly (infer F)[] ? F : never;

