import { describe, expect, test } from "bun:test";
import { withRequestTimeout } from "./requestTimeout";

describe("bounded photo requests", () => {
  test("returns successful results", async () => {
    expect(await withRequestTimeout(Promise.resolve("saved"), 20)).toBe("saved");
  });
  test("rejects a stalled request so uploading can exit", async () => {
    await expect(withRequestTimeout(new Promise<never>(() => {}), 10)).rejects.toThrow("Request timeout");
  });
  test("preserves server errors", async () => {
    await expect(withRequestTimeout(Promise.reject(new Error("Upload refused")), 20)).rejects.toThrow("Upload refused");
  });
});