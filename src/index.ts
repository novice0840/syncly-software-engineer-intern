import axios from "axios";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { convertTimestampToYYYYMMDD, delay } from "./utils";
import * as dotenv from "dotenv";
import { HttpsProxyAgent } from "https-proxy-agent";

// 환경 변수 로드
dotenv.config();

const TOTAL_REVIEWS_PER_PRODUCT = 1500;
const SIZE_PER_PAGE = 10;
const MAX_PAGES = Math.ceil(TOTAL_REVIEWS_PER_PRODUCT / SIZE_PER_PAGE);
const DELAY = 10000;

// Oxylabs Residential Proxy 설정
const OXYLABS_PROXY_HOST = process.env.OXYLABS_PROXY_HOST || "pr.oxylabs.io";
const OXYLABS_PROXY_PORT = process.env.OXYLABS_PROXY_PORT || "7777";
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME || "your_username";
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD || "your_password";

// Proxy Agent 생성
const createProxyAgent = () => {
  const proxyUrl = `http://${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}@${OXYLABS_PROXY_HOST}:${OXYLABS_PROXY_PORT}`;
  return new HttpsProxyAgent(proxyUrl);
};

interface Review {
  productId: string;
  productName: string;
  reviewId: string;
  options: string[];
  userName: string;
  rating: number;
  date: string;
  title: string;
  content: string;
}

const crawlWithAxios = async <T>(
  url: string,
  productId: string
): Promise<T> => {
  console.log(`Crawling URL: ${url}`);
  
  // Proxy Agent 생성
  const proxyAgent = createProxyAgent();
  
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Connection: "keep-alive",
      Referer: `https://www.coupang.com/vp/products/${productId}`,
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    httpsAgent: proxyAgent,
    timeout: 30000,
  });
  return response.data;
};

const getReviews = async (
  productid: string,
  page: number,
  retries: number = 3
): Promise<Review[]> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://www.coupang.com/next-api/review?productId=${productid}&page=${page}&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;

      const data: any = await crawlWithAxios(url, productid);

      if (data.rData && data.rData.paging && data.rData.paging.contents) {
        const reviews = data.rData.paging.contents.map((review: any) => {
          return {
            productId: review.productId,
            productName: review.itemName.split(", ")[0],
            reviewId: review.reviewId,
            options: review.itemName.split(", ").slice(1),
            userName: review.member.name,
            rating: review.rating,
            date: convertTimestampToYYYYMMDD(review.reviewAt),
            title: review.title,
            content: review.content,
          };
        });
        
        console.log(`✅ Successfully fetched ${reviews.length} reviews for product ${productid}, page ${page}`);
        return reviews;
      }
      
      console.log(`⚠️ No reviews found for product ${productid}, page ${page}`);
      return [];
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${retries} failed for product ${productid}, page ${page}:`, error instanceof Error ? error.message : error);
      
      if (attempt === retries) {
        console.log(`🔥 All ${retries} attempts failed for product ${productid}, page ${page}`);
        return [];
      }
      
      // 재시도 전 대기
      await delay(DELAY * attempt);
    }
  }
  
  return [];
};

const getAllReviews = async (
  productId: string,
  maxPages: number
): Promise<Review[]> => {
  const allReviews: Review[] = [];

  console.log(
    `Starting to collect reviews for product ${productId} (pages 1-${maxPages})`
  );

  for (let page = 2; page <= maxPages; page++) {
    console.log(`Fetching page ${page}/${maxPages} for product ${productId}`);
    const pageReviews = await getReviews(productId, page);

    allReviews.push(...pageReviews);

    // 페이지 당 리뷰 갯수가 10개 미만이면 더 이상 리뷰가 없다고 판단
    if (pageReviews.length < 10) {
      break;
    }
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

const main = async () => {
  const productIDs = [
    // "130180913",
    // "7059056549",
    // "8401815959",
    "5720576807",
    // "5609088403",
  ];

  try {
    console.log("=== 🚀 쿠팡 리뷰 크롤링 시작 ===");
    console.log(`📊 수집할 제품 수: ${productIDs.length}`);
    console.log(`📝 각 제품당 최대 리뷰 수: ${TOTAL_REVIEWS_PER_PRODUCT}`);
    console.log(`⏰ 각 요청간 대기 시간: ${DELAY}ms`);
    console.log(`🔄 재시도 횟수: 3회`);
    console.log("🌐 Oxylabs Residential Proxy 사용");
    console.log(`   - Host: ${OXYLABS_PROXY_HOST}`);
    console.log(`   - Port: ${OXYLABS_PROXY_PORT}`);
    console.log(`   - Username: ${OXYLABS_USERNAME}`);
    console.log("────────────────────────────────────");

    const allProductReviews: { productId: string; reviews: Review[] }[] = [];

    for (const productId of productIDs) {
      console.log(`\n🔍 Starting collection for product: ${productId}`);
      const reviews = await getAllReviews(productId, MAX_PAGES);
      allProductReviews.push({ productId, reviews });
      
      console.log(`✅ Completed product ${productId}: ${reviews.length} reviews collected`);
    }

    console.log("\n=== 📊 수집 결과 요약 ===");
    let totalReviews = 0;
    allProductReviews.forEach((product) => {
      console.log(`📦 Product ${product.productId}: ${product.reviews.length} reviews`);
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
