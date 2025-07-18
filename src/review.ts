import type { Review } from "./type";
import { DELAY, SIZE_PER_PAGE } from "./constant";
import { convertTimestampToYYYYMMDD, crawlWithAxios, delay } from "./utils";

export const getReviews = async (
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

export const getAllReviews = async (
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

export const getMaxPage = async (
  productId: string
): Promise<number | undefined> => {
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
