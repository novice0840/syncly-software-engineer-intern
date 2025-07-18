import { MAX_PAGES } from "./constant";
import { getAllReviews, getMaxPage } from "./review";
import { Review } from "./type";
import { createExcelFile } from "./utils";

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

  const productPromises = productIDs.map(async (productId) => {
    try {
      const maxPage = await getMaxPage(productId);
      console.log(
        `🔍 ${productId} 제품 수집을 시작합니다 (최대 페이지: ${maxPage})`
      );

      if (!maxPage) {
        console.log(`⚠️ ${productId} 제품에서 리뷰를 찾을 수 없습니다`);
        return { productId, reviews: [] };
      }

      const reviews = await getAllReviews(
        productId,
        Math.min(maxPage, MAX_PAGES)
      );
      console.log(`✅ ${productId} 제품 완료: ${reviews.length}개 리뷰 수집됨`);
      return { productId, reviews };
    } catch (error) {
      console.error(`❌ ${productId} 제품 처리 중 에러 발생:`, error);
      return { productId, reviews: [] };
    }
  });

  const allProductReviews = await Promise.all(productPromises);
  printCrawlingSummary(allProductReviews);

  const excelFilePath = createExcelFile(allProductReviews);
  console.log(`\n📄 엑셀 파일이 생성되었습니다: ${excelFilePath}`);
};

const init = () => {
  try {
    main();
  } catch (error) {
    console.error("❌ 메인함수 실행 중 에러:", error);
  }
};

init();
