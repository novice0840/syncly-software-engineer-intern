import axios from "axios";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { convertTimestampToYYYYMMDD, createProxyAgent, delay } from "./utils";
import * as dotenv from "dotenv";

dotenv.config();
interface Review {
  productId: string;
  productName: string;
  reviewId: string;
  options: string; // 배열에서 문자열로 변경
  userName: string;
  rating: number;
  date: string;
  title: string;
  content: string;
}

const TOTAL_REVIEWS_PER_PRODUCT = 1500;
const SIZE_PER_PAGE = 10;
const MAX_PAGES = Math.ceil(TOTAL_REVIEWS_PER_PRODUCT / SIZE_PER_PAGE);
const DELAY = 5000;

const crawlWithAxios = async <T>(
  url: string,
  productId: string
): Promise<T> => {
  console.log(`Crawling URL: ${url}`);

  const proxyAgent = createProxyAgent();
  const headers = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language":
      "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5",
    "cache-control": "no-cache",
    connection: "keep-alive",
    pragma: "no-cache",
    priority: "u=0, i",
    referer: `https://www.coupang.com/vp/products/${productId}`,
    "sec-ch-ua":
      '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  };

  const response = await axios.get(url, {
    headers,
    httpsAgent: proxyAgent,
    timeout: 10000,
  });
  return response.data;
};

const getReviews = async (
  productId: string,
  page: number
): Promise<Review[]> => {
  try {
    const url = `https://www.coupang.com/next-api/review?productId=${productId}&page=${page}&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;

    const data: any = await crawlWithAxios(url, productId);

    if (data.rData && data.rData.paging && data.rData.paging.contents) {
      const reviews = data.rData.paging.contents.map((review: any) => {
        return {
          productId: review.productId,
          productName: review.itemName.split(", ")[0],
          reviewId: review.reviewId,
          options: review.itemName.split(", ").slice(1).join(", "), // 엑셀에서는 배열로 처리하기 어려우므로 문자열로 변경
          userName: review.member.name,
          rating: review.rating,
          date: convertTimestampToYYYYMMDD(review.reviewAt),
          title: review.title,
          content: review.content,
        };
      });

      console.log(
        `✅ Successfully fetched ${reviews.length} reviews for product ${productId}, page ${page}`
      );
      return reviews;
    }

    console.log(`⚠️ No reviews found for product ${productId}, page ${page}`);
    return [];
  } catch (error) {
    console.log(
      `❌ Error fetching reviews for product ${productId}, page ${page}:`
    );
    console.log(error);
    return [];
  }
};

const getAllReviews = async (
  productId: string,
  maxPages: number
): Promise<Review[]> => {
  const allReviews: Review[] = [];

  console.log(
    `Starting to collect reviews for product ${productId} (pages 1-${maxPages})`
  );

  for (let page = 1; page <= maxPages; page++) {
    console.log(`Fetching page ${page}/${maxPages} for product ${productId}`);
    const pageReviews = await getReviews(productId, page);

    allReviews.push(...pageReviews);
    // IP밴을 막기 위해 각 요청 사이에 지연을 추가
    await delay(DELAY);
  }

  console.log(
    `Collected ${allReviews.length} reviews for product ${productId}`
  );
  return allReviews;
};

const createExcelFile = (
  allProductReviews: { productId: string; reviews: Review[] }[]
) => {
  const workbook = XLSX.utils.book_new();

  const allReviews: Review[] = [];
  allProductReviews.forEach((product) => {
    allReviews.push(...product.reviews);
  });

  if (allReviews.length > 0) {
    const worksheet = XLSX.utils.json_to_sheet(allReviews);
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Reviews");
  }

  allProductReviews.forEach((product) => {
    const worksheet = XLSX.utils.json_to_sheet(product.reviews);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Product ${product.productId}`
    );
  });

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `coupang_reviews_${timestamp}.xlsx`;
  const filepath = path.join(outputDir, filename);

  XLSX.writeFile(workbook, filepath);
  console.log(`Excel file created: ${filepath}`);

  return filepath;
};

const getMaxPage = async (productId: string): Promise<number | undefined> => {
  const url = `https://www.coupang.com/next-api/review?productId=${productId}&page=1&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;
  const data: any = await crawlWithAxios(url, productId);
  return data.rData?.paging?.totalPage;
};

const main = async () => {
  const productIDs = [
    "130180913",
    "7059056549",
    "8401815959",
    "5720576807",
    "5609088403",
  ];

  try {
    console.log("=== 🚀 쿠팡 리뷰 크롤링 시작 ===");
    console.log(`📊 수집할 제품 수: ${productIDs.length}`);
    console.log(`📝 각 제품당 최대 리뷰 수: ${TOTAL_REVIEWS_PER_PRODUCT}`);
    console.log(`⏰ 각 요청간 대기 시간: ${DELAY}ms`);
    const allProductReviews: { productId: string; reviews: Review[] }[] = [];

    for (const productId of productIDs) {
      const maxPage = await getMaxPage(productId);
      console.log(
        `\n🔍 Starting collection for product: ${productId} (Max pages: ${maxPage})`
      );
      console.log(`\n🔍 Starting collection for product: ${productId}`);

      if (maxPage) {
        const reviews = await getAllReviews(
          productId,
          Math.min(maxPage, MAX_PAGES)
        );
        allProductReviews.push({ productId, reviews });
        console.log(
          `✅ Completed product ${productId}: ${reviews.length} reviews collected`
        );
      } else {
        console.log(`⚠️ No reviews found for product ${productId}`);
      }
    }

    console.log("\n=== 📊 수집 결과 요약 ===");
    let totalReviews = 0;
    allProductReviews.forEach((product) => {
      console.log(
        `📦 Product ${product.productId}: ${product.reviews.length} reviews`
      );
      totalReviews += product.reviews.length;
    });
    console.log(`📋 총 리뷰 수: ${totalReviews}`);

    const excelFilePath = createExcelFile(allProductReviews);
    console.log(`\n📄 엑셀 파일이 생성되었습니다: ${excelFilePath}`);
    console.log("🎉 크롤링 완료!");
  } catch (error) {
    console.error("❌ 메인 실행 중 에러:", error);
  }
};

main();
