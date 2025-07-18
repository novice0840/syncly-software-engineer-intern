import { describe, it, expect } from "vitest";
import { delay, convertTimestampToYYYYMMDD } from "./utils";

describe("utils.ts", () => {
  describe("delay", () => {
    it("지정된 밀리초 동안 실행을 지연시켜야 합니다", async () => {
      const start = Date.now();
      const delayTime = 100;

      await delay(delayTime);

      const end = Date.now();
      const elapsed = end - start;

      // 타이밍에 약간의 오차를 허용합니다
      expect(elapsed).toBeGreaterThanOrEqual(delayTime - 10);
      expect(elapsed).toBeLessThan(delayTime + 50);
    });

    it("Promise를 반환해야 합니다", () => {
      const result = delay(100);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("convertTimestampToYYYYMMDD", () => {
    it("타임스탬프를 YYYY-MM-DD 형식으로 변환해야 합니다", () => {
      // 2023-01-15 12:30:45
      const timestamp = 1673785845000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-01-15");
    });

    it("한 자리 월과 일을 0으로 패딩하여 처리해야 합니다", () => {
      // 2023-03-05 08:15:30
      const timestamp = 1678003530000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-03-05");
    });

    it("12월 31일을 올바르게 처리해야 합니다", () => {
      // 2023-12-31 00:00:00 UTC
      const timestamp = 1703980800000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2023-12-31");
    });

    it("윤년 2월 29일을 처리해야 합니다", () => {
      // 2024-02-29 12:00:00 (윤년)
      const timestamp = 1709208000000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2024-02-29");
    });

    it("2000년(Y2K)을 처리해야 합니다", () => {
      // 2000-01-01 00:00:00
      const timestamp = 946684800000;
      const result = convertTimestampToYYYYMMDD(timestamp);

      expect(result).toBe("2000-01-01");
    });
  });
});
