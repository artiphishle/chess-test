/** Board size limits shared by the template editor and server-side validation. */
export const BOARD_DIMENSIONS = { min: 2, max: 24 } as const;

/** Every selectable board dimension, inclusive of both limits. */
export const BOARD_DIMENSION_OPTIONS: readonly number[] = Array.from(
  { length: BOARD_DIMENSIONS.max - BOARD_DIMENSIONS.min + 1 },
  (_, index) => BOARD_DIMENSIONS.min + index,
);
