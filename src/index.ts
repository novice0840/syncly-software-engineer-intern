import {
  convertTimestampToYYYYMMDD,
  crawlWithAxios,
  delay,
  createExcelFile,
} from "./utils";

export interface Review {
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

const TOTAL_REVIEWS_PER_PRODUCT = 150;
const SIZE_PER_PAGE = 10;
const MAX_PAGES = Math.ceil(TOTAL_REVIEWS_PER_PRODUCT / SIZE_PER_PAGE);
const DELAY = 5000;

const getReviews = async (
  productId: string,
  page: number
): Promise<Review[]> => {
  try {
    const url = `https://www.coupang.com/next-api/review?productId=${productId}&page=${page}&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;

    const data: {
      rData: {
        paging: {
          contents: unknown[];
        };
      };
    } = await crawlWithAxios(url, productId);

    if (data?.rData?.paging?.contents) {
      const reviews = data.rData.paging.contents.map((review: any) => ({
        productId: review.productId,
        productName: review.itemName.split(", ")[0],
        reviewId: review.reviewId,
        options: review.itemName.split(", ").slice(1).join(", "), // 엑셀에서는 배열로 처리하기 어려우므로 문자열로 변경
        userName: review.member.name,
        rating: review.rating,
        date: convertTimestampToYYYYMMDD(review.reviewAt),
        title: review.title,
        content: review.content,
      }));

      console.log(
        `✅ ${productId} 제품의 ${page}페이지에서 ${reviews.length}개 리뷰를 성공적으로 가져왔습니다`
      );
      return reviews;
    }

    console.log(
      `⚠️ ${productId} 제품의 ${page}페이지에서 리뷰를 찾을 수 없습니다`
    );
    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getAllReviews = async (
  productId: string,
  maxPages: number
): Promise<Review[]> => {
  const allReviews: Review[] = [];

  for (let page = 1; page <= maxPages; page++) {
    console.log(
      `${productId} 제품의 ${page}/${maxPages}페이지를 가져오는 중입니다`
    );
    const pageReviews = await getReviews(productId, page);

    allReviews.push(...pageReviews);
    // IP밴을 막기 위해 각 요청 사이에 지연을 추가
    await delay(DELAY);
  }
  return allReviews;
};

const getMaxPage = async (productId: string): Promise<number | undefined> => {
  const url = `https://www.coupang.com/next-api/review?productId=${productId}&page=1&size=${SIZE_PER_PAGE}&sortBy=ORDER_SCORE_ASC&ratingSummary=true&ratings=&market=`;
  const data: {
    rData: {
      paging: {
        totalPage?: number;
      };
    };
  } = await crawlWithAxios(url, productId);
  return data.rData?.paging?.totalPage;
};

const printCrawlingSummary = (
  allProductReviews: { productId: string; reviews: Review[] }[]
) => {
  console.log("\n=== 📊 수집 결과 요약 ===");
  let totalReviews = 0;
  allProductReviews.forEach((product) => {
    console.log(
      `📦 제품 ${product.productId}: ${product.reviews.length}개 리뷰`
    );
    totalReviews += product.reviews.length;
  });
  console.log(`📋 총 리뷰 수: ${totalReviews}`);
};

const main = async () => {
  const productIDs = [
    "130180913",
    "7059056549",
    "8401815959",
    "5720576807",
    "5609088403",
  ];

  console.log("=== 🚀 쿠팡 리뷰 크롤링 시작 ===");
  console.log(`📊 수집할 제품 수: ${productIDs.length}`);
  console.log(`📝 각 제품당 최대 리뷰 수: ${TOTAL_REVIEWS_PER_PRODUCT}`);
  console.log(`⏰ 각 요청간 대기 시간: ${DELAY}ms`);

  const productPromises = productIDs.map(async (productId) => {
    try {
      const maxPage = await getMaxPage(productId);
      console.log(
        `🔍 ${productId} 제품 수집을 시작합니다 (최대 페이지: ${maxPage})`
      );

      if (maxPage) {
        const reviews = await getAllReviews(
          productId,
          Math.min(maxPage, MAX_PAGES)
        );
        console.log(
          `✅ ${productId} 제품 완료: ${reviews.length}개 리뷰 수집됨`
        );
        return { productId, reviews };
      } else {
        console.log(`⚠️ ${productId} 제품에서 리뷰를 찾을 수 없습니다`);
        return { productId, reviews: [] };
      }
    } catch (error) {
      console.error(`❌ ${productId} 제품 처리 중 에러 발생:`, error);
      return { productId, reviews: [] };
    }
  });

  const allProductReviews = await Promise.all(productPromises);
  printCrawlingSummary(allProductReviews);

  const excelFilePath = createExcelFile(allProductReviews);
  console.log(`\n📄 엑셀 파일이 생성되었습니다: ${excelFilePath}`);
  console.log("🎉 크롤링 완료!");
};

const init = () => {
  try {
    main();
  } catch (error) {
    console.error("❌ 메인함수 실행 중 에러:", error);
  }
};

init();
