import { expect, test } from "bun:test";
import { appendCompletionPhotos, validCompletionPhotoCounts, MIN_COMPLETION_PHOTOS_PER_TYPE, MAX_COMPLETION_PHOTOS_PER_TYPE } from "./completionPhotoLimits.ts";

test("before selection never exceeds five when nine photos arrive in overlapping batches", () => {
  const before = appendCompletionPhotos(appendCompletionPhotos([], [1,2,3,4]), [5,6,7,8,9]);
  expect(before).toEqual([1,2,3,4,5]);
});
test("after selection never exceeds five", () => {
  expect(appendCompletionPhotos([1,2,3,4], [5,6,7,8,9])).toHaveLength(5);
});
test("submission permits five before and five after, but rejects nine in either group", () => {
  expect(validCompletionPhotoCounts(5,5)).toBe(true);
  expect(validCompletionPhotoCounts(9,5)).toBe(false);
  expect(validCompletionPhotoCounts(5,9)).toBe(false);
  expect(validCompletionPhotoCounts(0,5)).toBe(false);
});
test("minimum is three photos in each group", () => {
  expect(MIN_COMPLETION_PHOTOS_PER_TYPE).toBe(3);
  expect(validCompletionPhotoCounts(2,3)).toBe(false);
  expect(validCompletionPhotoCounts(3,2)).toBe(false);
  expect(validCompletionPhotoCounts(3,3)).toBe(true);
});
