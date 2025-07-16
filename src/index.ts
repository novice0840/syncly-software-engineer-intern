import axios from "axios";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const TOTAL_REVIEWS_PER_PRODUCT = 1500;
const SIZE_PER_PAGE = 10;
const MAX_PAGES = Math.ceil(TOTAL_REVIEWS_PER_PRODUCT / SIZE_PER_PAGE);

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

const crawlWithAxios = async <T>(url: string): Promise<T> => {
  console.log(`Crawling URL: ${url}`);
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
  return response.data;
};

const convertTimestampToYYYYMMDD = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getReviews = async (
  productid: string,
  page: number
): Promise<Review[]> => {
  try {
    const url = `https://www.coupang.com/next-api/review?productId=${productid}&page=${page}&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;

    const data: any = await crawlWithAxios(url);

    if (data.rData && data.rData.paging && data.rData.paging.contents) {
      return data.rData.paging.contents.map((review: any) => {
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
    }
    return [];
  } catch (error) {
    console.log(
      `Error fetching reviews for product ${productid} on page ${page}:`,
      error
    );
    return [];
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // 페이지 당 리뷰 갯수가 10개 미만이면 더 이상 리뷰가 없다고 판단
    if (pageReviews.length < 10) {
      break;
    }
    // IP밴을 막기 위해 각 요청 사이에 지연을 추가
    await delay(3000);
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
    console.log("=== 쿠팡 리뷰 크롤링 시작 ===");
    console.log(`수집할 제품 수: ${productIDs.length}`);
    console.log(`각 제품당 최대 리뷰 수: 1500`);
    console.log("각 요청간 5초 대기");

    const allProductReviews: { productId: string; reviews: Review[] }[] = [];

    for (const productId of productIDs) {
      const reviews = await getAllReviews(productId, MAX_PAGES);
      allProductReviews.push({ productId, reviews });
    }

    console.log("\n=== 수집 결과 요약 ===");
    let totalReviews = 0;
    allProductReviews.forEach((product) => {
      console.log(
        `Product ${product.productId}: ${product.reviews.length} reviews`
      );
      totalReviews += product.reviews.length;
    });
    console.log(`총 리뷰 수: ${totalReviews}`);

    const excelFilePath = createExcelFile(allProductReviews);
    console.log(`\n엑셀 파일이 생성되었습니다: ${excelFilePath}`);
  } catch (error) {
    console.error("메인 실행 중 에러:", error);
  }
};

main();
