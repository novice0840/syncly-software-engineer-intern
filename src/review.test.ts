import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getReviews, getAllReviews, getMaxPage } from "./review";
import * as utils from "./utils";

vi.mock("./utils", async () => {
  const actual = await vi.importActual("./utils");
  return {
    ...actual,
    crawlWithAxios: vi.fn(),
    delay: vi.fn(),
  };
});

vi.mock("./constant", () => ({
  DELAY: 1000,
  SIZE_PER_PAGE: 10,
}));

describe("review.ts", () => {
  const mockCrawlWithAxios = vi.mocked(utils.crawlWithAxios);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getReviews", () => {
    const productId = "123456789";
    const page = 1;

    it("API 응답 구조가 올바르지 않을 때 빈 배열을 반환해야 합니다", async () => {
      const mockApiResponse = {
        rData: null,
      };

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      const result = await getReviews(productId, page);

      expect(result).toEqual([]);
    });

    it("API 호출이 실패할 때 빈 배열을 반환", async () => {
      mockCrawlWithAxios.mockRejectedValue(new Error("네트워크 에러"));

      const result = await getReviews(productId, page);

      expect(result).toEqual([]);
    });

    it("API 호출 URL 확인", async () => {
      const mockApiResponse = {
        rData: {
          paging: {
            contents: [],
          },
        },
      };

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      await getReviews(productId, page);

      expect(mockCrawlWithAxios).toHaveBeenCalledWith(
        `https://www.coupang.com/next-api/review?productId=${productId}&page=${page}&size=10&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`,
        productId
      );
    });
  });

  describe("getAllReviews", () => {
    const productId = "123456789";
    const maxPages = 1;

    it("crawlWithAxios로 응답받은 값을 정상적으로 parsing하는 지 확인", async () => {
      const mockApiResponse = {
        rData: {
          paging: {
            contents: [
              {
                productId,
                itemName: "Test Product, Option1, Option2",
                reviewId: "review123",
                member: { name: "User1" },
                rating: 5,
                reviewAt: 1673785845000,
                title: "Great product!",
                content: "I really liked this product.",
              },
            ],
          },
        },
      };

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      const result = await getAllReviews(productId, maxPages);

      expect(result).toEqual([
        {
          productId,
          productName: "Test Product",
          reviewId: "review123",
          options: "Option1, Option2",
          userName: "User1",
          rating: 5,
          date: "2023-01-15",
          title: "Great product!",
          content: "I really liked this product.",
        },
      ]);
    });
  });

  describe("getMaxPage", () => {
    const productId = "123456789";

    it("최대 페이지 수를 성공적으로 반환해야한다", async () => {
      const mockApiResponse = {
        rData: {
          paging: {
            totalPage: 25,
          },
        },
      };

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      const result = await getMaxPage(productId);

      expect(result).toBe(25);
    });

    it("totalPage가 없을 때 undefined를 반환해야한다", async () => {
      const mockApiResponse = {
        rData: {
          paging: {},
        },
      };

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      const result = await getMaxPage(productId);

      expect(result).toBeUndefined();
    });

    it("API 응답 구조가 올바르지 않을 때 undefined를 반환해야한다", async () => {
      const mockApiResponse = null;

      mockCrawlWithAxios.mockResolvedValue(mockApiResponse);

      const result = await getMaxPage(productId);

      expect(result).toBeUndefined();
    });
  });
});
