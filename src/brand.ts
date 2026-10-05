declare const brand: unique symbol;

/** Compile-time distinction; values must be validated at the application boundary. */
export type Brand<T, Name extends PropertyKey> = T & {
  readonly [brand]: { readonly [Key in Name]: true };
};
