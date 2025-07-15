import axios from "axios";
import * as cheerio from "cheerio";

class WebCrawler {
  constructor() {
    console.log("웹 크롤러 초기화");
  }

  async crawlWithAxios(url: string): Promise<void> {
    try {
      console.log(`크롤링 시작: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "PostmanRuntime/7.43.4",
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Connection: "keep-alive",
          Referer: "https://www.coupang.com/",
        },
        timeout: 10000,
      });
      console.log(response.data);
    } catch (error) {
      console.error("크롤링 중 에러 발생:", error);
      throw error;
    }
  }
}

async function main() {
  const crawler = new WebCrawler();

  // 테스트용 URL (실제 사용 시 변경)
  const testUrl =
    "https://www.coupang.com/next-api/review?productId=130180913&page=1&size=10&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=";
  const a = "https://www.naver.com/";
  try {
    // Axios 크롤링 테스트
    console.log("=== Axios 크롤링 테스트 ===");
    await crawler.crawlWithAxios(testUrl);
  } catch (error) {
    console.error("메인 실행 중 에러:", error);
  }
}

main();
