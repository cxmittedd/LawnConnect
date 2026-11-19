export const MAX_COMPLETION_PHOTOS_PER_TYPE = 5;
export const MIN_COMPLETION_PHOTOS_PER_TYPE = 3;

/** Apply the limit against the latest selection, not a pre-compression snapshot. */
export function appendCompletionPhotos<T>(current: T[], incoming: T[]): T[] {
  return [...current, ...incoming].slice(0, MAX_COMPLETION_PHOTOS_PER_TYPE);
}

export function validCompletionPhotoCounts(before: number, after: number): boolean {
  return before >= MIN_COMPLETION_PHOTOS_PER_TYPE && before <= MAX_COMPLETION_PHOTOS_PER_TYPE
    && after >= MIN_COMPLETION_PHOTOS_PER_TYPE && after <= MAX_COMPLETION_PHOTOS_PER_TYPE;
}