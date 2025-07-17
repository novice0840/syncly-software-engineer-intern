import { describe, it, expect, vi, beforeEach } from "vitest";
import { delay, convertTimestampToYYYYMMDD, createProxyAgent } from "./utils";

describe("utils", () => {
  describe("delay", () => {
    it("should delay execution for specified milliseconds", async () => {
      const start = Date.now();
      const delayTime = 100;

      await delay(delayTime);

      const end = Date.now();
      const elapsed = end - start;

      // Allow for some tolerance in timing
      expect(elapsed).toBeGreaterThanOrEqual(delayTime - 10);
      expect(elapsed).toBeLessThan(delayTime + 50);
    });

    it("should return a promise", () => {
      const result = delay(100);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("convertTimestampToYYYYMMDD", () => {
    it("should convert timestamp to YYYY-MM-DD format", () => {
      // 2023-01-15 12:30:45
      const timestamp = 1673785845000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-01-15");
    });

    it("should handle single digit months and days with zero padding", () => {
      // 2023-03-05 08:15:30
      const timestamp = 1678003530000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-03-05");
    });

    it("should handle December 31st correctly", () => {
      // 2023-12-31 00:00:00 UTC
      const timestamp = 1703980800000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-12-31");
    });

    it("should handle leap year February 29th", () => {
      // 2024-02-29 12:00:00 (leap year)
      const timestamp = 1709208000000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2024-02-29");
    });

    it("should handle year 2000 (Y2K)", () => {
      // 2000-01-01 00:00:00
      const timestamp = 946684800000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2000-01-01");
    });
  });
});
