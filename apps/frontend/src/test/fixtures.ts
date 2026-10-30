// Fixture test cukup berisi field yang dibaca komponen yang diuji; field lain
// tidak ikut diperiksa. partialFixture menandai hal itu secara eksplisit dan
// menjadi satu-satunya tempat cast untuk data uji sebagian.
export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

export function partialFixture<T>(value: DeepPartial<T>): T {
  return value as T
}
