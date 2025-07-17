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
  options: string[];
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
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language":
      "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Priority: "u=0, i",
    "sec-ch-ua":
      '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "Upgrade-Insecure-Requests": "1",
    Cookie:
      "PCID=17413441452178760399210; MARKETID=17413441452178760399210; x-coupang-accept-language=ko-KR; delivery_toggle=false; gd1=Y; x-coupang-target-market=KR; shield_FPD=SC2PuesT1owm80VDUjDfW4tDUzuirwjPVE; trac_itime=20250626091441; sid=306cbc4cb18948098544a43c7628234399934cfc; overrideAbTestGroup=%5B%5D; bm_ss=ab8e18ef4e; bm_so=87D22B8126712A0DCF5C98F0A64CE1570299EA6E85FAC40122A94CC4CFDB5E17~YAAQNq0sF/2rARWYAQAA0wbVFQRVJnq+Ji1lVrQgzzbQ2i2PMYLDvvyaAnR6hh1J8PCYVPAtuQNoX70dPCXhDLmpT1D8kdHD/237eJzHGUIKiK8kwSnNiFRhzkZH96BocMF+0O4ub5WgfKQTD3Yt8GVBsdAzuk5DrWPxAH3hR39nXYzk+fgaZXaQ2wFhQYYNzenL+jS+2m4+t0iPAPVGENyoGsMpqZvxMPBeP71THRUlp/5WPq4tWhnxHKWpOU6zud+wPRP4j8m5lrLqaTfmuGinj02hnb3Iszh8V+FSbSNFRv8RCnMLAFC306K6Uezw1+pPldTvKDcFwVJ8h7vJnGPa7dE/9pvuHvUgp3yvH3+JVA6ZfGFodUeuKhI3itvKMJBN79nnLGtpJoHye5DXnn+OyCRGidjA7Rum8Tvmk6t8SYlNKZ89d6GMg1grVlgC0iPD27tqmliTBxYAKZqISA==; bm_mi=56A2A7DA2757D85BBCDDC69DDE80FE7E~YAAQNq0sF4yxARWYAQAAAAvVFRzkcEFmSxh6LgiWQ4dYOPM+j0mK1hA4Ofw7Wvs34jUW1QLiw2AiJXV3K6zwioHfob0l4MJ2jsl7TR0dN+Ubtc32D5rTQ/uM/Qps5+eHd2PmUWQcLANIjHBF0oiLmT4/crqUl2rnU6yy/fFIIyW+qNHmVLwM8opEr3bbnh2elMJod7O9qL9xK0/Zmprx/1CZ0POlUv47oAlpa3oivIMhoQrBKKBRWfw4atIgL4vv94k+T/SxIkqct09oAWvVdySE4hwGUc7kxKn5AgUgPWRvcN9H2TGj8/wxLQX19qyRKMnK1rzc4Q9dcfpGkG49hmVajiw=~1; cto_bundle=CIz1kV9HY1RsNlJzUE9zZzJpY1c1WUZwOGtZWVFrYXlpV0hiOFRPNzRpbmJsRiUyQjdqR29BRVpOZGlNNnZQNEZnb2ZYTCUyRmxmSjZpTURwNjQxRUtZVVRFWmhSbVNJRHB4aGZjRTAyaVQ1Yjk3STdGdzQxYnpQeUR0UzdXM2FKUXVRMzFXOU5SUVFYaDklMkJmV2JDN1ZzUHpiME5oSGExandIdHpiQjJ2SXphTXc4S0xzU0w2MTY2Z0RuOHJseDBtNjNLZFBMMFZ5SXFuazMwUmVVYlprWUZSSDhOVWhBJTNEJTNE; bm_lso=87D22B8126712A0DCF5C98F0A64CE1570299EA6E85FAC40122A94CC4CFDB5E17~YAAQNq0sF/2rARWYAQAA0wbVFQRVJnq+Ji1lVrQgzzbQ2i2PMYLDvvyaAnR6hh1J8PCYVPAtuQNoX70dPCXhDLmpT1D8kdHD/237eJzHGUIKiK8kwSnNiFRhzkZH96BocMF+0O4ub5WgfKQTD3Yt8GVBsdAzuk5DrWPxAH3hR39nXYzk+fgaZXaQ2wFhQYYNzenL+jS+2m4+t0iPAPVGENyoGsMpqZvxMPBeP71THRUlp/5WPq4tWhnxHKWpOU6zud+wPRP4j8m5lrLqaTfmuGinj02hnb3Iszh8V+FSbSNFRv8RCnMLAFC306K6Uezw1+pPldTvKDcFwVJ8h7vJnGPa7dE/9pvuHvUgp3yvH3+JVA6ZfGFodUeuKhI3itvKMJBN79nnLGtpJoHye5DXnn+OyCRGidjA7Rum8Tvmk6t8SYlNKZ89d6GMg1grVlgC0iPD27tqmliTBxYAKZqISA==^1752712941130; ak_bmsc=AB5AEE629325F9F37BF9728C9983A13D~000000000000000000000000000000~YAAQNq0sF663ARWYAQAAvQ/VFRx6KwF2wZNUDvO/8XJWAxIIlC0Pshhw6FFttdKcYYk2THwpP/vnCIaNvkTWillklU+JvBKPUOGH7WjlWIC6MCbz69wmKzGHaNE66JCwZCjZW51uPyuFFrvp86raAGrIWlqqG7/j7RafzAboW0ljksccoekghRsWxfLBOX3Orrbg/I9djQhptNQBkOfETNsdM1jwq5PYRlglx616Vly2LxewWS/LhNHPw9/KQA9AdXsuL99a8NZh0KMHtxK+LZ3CbMBq0n4veYQ3ZqV40K9qfMUqoYkbDUyGKPddq3OAE58DLDPnUCEx49inY/CTWuyhwLqHeb3KTSagkwid+84aJja1yPuboOe3iZKU5Lz0qgVlqiSyuweTW0MSLdLiJJn0GiMFQJSS3F8gZXrL067pbLKReXhHfAjyKtTmDCy4l1HTGaMd3ngK5mRZeowV8BB7nadOJ6/SG1vUQlGfM7mriKhnDnA5waINKKx3AkO0z4w6YpY=; _abck=8A2934064C3B0A968E244910FD55C4DE~-1~YAAQNq0sF5W9ARWYAQAAbRTVFQ4Iz8dgZUZxkSei0Rj/GI26TgAZrCQb/06wl2sAuCK72TekExxKDgFUmESgcDXYUgOe2FMXWkdIufC4ohba7kKbheSSbACxXK/c/gmJy3xGi5dsXGxHuE0L0ru60R9qFnBWI5OYpiFL8Xnw/lIRvIFxxZc7o4uwcCdDuFeo43QXXMLGsv3wAFTAGwe36qzpvu1tRDf8hF/au65243piPbJ9pt4UtEH+e8XR/54AmHIt7Ba5fQgq6oEHxldFSzUPJj/KyiQeTumLRPpOxeEArkUQlQzu7kGk79x3mA8iXzVSL8lNnEF4sBRVLasu6ra2acicu1sJO5s4FLxfxVS0WKtfcx0ZUz3HSqskxo+ULrvaT8UgUTaCtGgCw37dzDq63UZvDEyKlK3/6QHUtjUGN7BagISxswKiMyR3ly9NLmnDlqz6ie92SjAEd5AuD41101UXcTpCVMnfx6BBe/q9ppWcDA6KTypCWExBfuSOQE1q0EZVCBGxrkYj9DT1orbtLX60RyfTjJhAanRjzRJbwxxMlemRTDh4YyBSznY4YAZZKdxs9548IVtQIVq7n8J3Kv808wyk9Rgd6epe8xl9qeX/1PHktFjeQ2+RqaxvC5+7UT/IXmtaODn9RUDJfNtCDpLoql8fRhQxNZIJpaUbRmhFtsjZaSJWDutQcVOXq9TT9in7T6lc/yF8roshJsNBa3jVTabYWixRTju7v6/lyCP/e+6cA4Z6GACTvEqOe1Bve8TvXAmxzMCgxukkN8xeAPVCCfda2SQuez7PUdAT3BAspZUHqnfuPeipRA==~-1~||0||~-1; bm_s=YAAQNa0sF6vUABSYAQAAgk3VFQP2CZBTSYLyG5BnjSihrZMtlg38SSoffvYzJudnT6nmPmDnFUNkbMwq14qgYMDy78QDx8hyO19f5R3t25/WwUXBlO/VLhJvWFWE3grtEsJj3czxM/lceY1QXmu0ic9IdhYQqtHMNGP/hWwKW2cQ0flD3mUSrMHEVPTNZ/LXX/fvrvy9DcQTy527GdD4siIhyKKhDw+6lOHuSA/rZcx426WgPXf/yiJ206FWLzgEAm5OjMwVwWGwzQZaRy7icnPKsfHgATXrwKBHKlZrx4csuvv9GZqd/vnJEAWLmzJ8ZCDiPwt9bIU2umd+6MW82nVLf9ZKIy1SCisR/jbcucqMyuZoaG3+B2IasGj/IyPSYTUkFIbpGcVp1G3/A1dN9w9ftpJ3qmTrGiGY760jFPhtA0i/Yfyvm1mZGBczUQFq3phmNPM8neQ1RcUMmHmWlG0qmowHLbIiXw1tVE8HVyBw5hnthA9LNbfTCyYsVTXQahhR/SMYHvosvDKRQSW6eH6hZMwCuB0pvVOGTk2miAcagZaE9+90aC8F+39UTVjGmYZ3BEsEzdHfaNdgkQR68yhi+HYJ0ww=; bm_sv=5EF3CD1F19079B1A89941E9A7FA4AF66~YAAQNa0sF6zUABSYAQAAgk3VFRzJCOoI9LUdge+VKZa6/lfPc0TLL8w+J7JmX4nG7fNGIkCrLyN2tyS5rMDlqol/Jd1eUxqt7Z6uQhLkjxDiDyVcwOqnJR0+11MHvbfgJvsPC/QLXWaNG0+1XPbQ4vGwSO9b3eu6o24R6+1AmJpmcPdDUdHjtR12P89AhFU6ufjTBDxyGzMops00vpl+rXfUiLphm0zx9qtPHjQhtJeOPNG5Y9K/WSmZpeP9PNjyBg==~1; bm_sz=22E62F8A8B0E0D6862CAFE770D80AC82~YAAQNa0sF67UABSYAQAAgk3VFRwwysr5dvuVFk4Nrfy3Bxj22BCwir6TJDMLWWRRoXKPUQd/JjGIDwf7mTdztBcrGbliop1o66Ioa76Y/cJHdToUrKqYHa4SNqMR6rH01oxp+NTwnz0+TMfPIQHu6zmQ7N+ynsZRAJc4cg1ykOT3KcK6p74dORKtgHJczc+E4AzvqBu91CsBQNF9fbav8HNnY37H21Skv1jHpNNbIWoUNTtlB368VBwiuzfT3+luKJ7+Lww7Dzbssep1tuiJEcpsrd5RK0secx2sFmIUE1si3tdGddWee/6b+VNa/CnZoqU0yl1vxvyxG5/rPfy207DLXrHxtoMPAEJp63wg0hZeqFwOew0Ax2cUqeBKg58zcpTMzTD/dvCvrkgWrkwuorxLMdd0wsRkLslZzY1kqZA=~4604466~4272434",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    Referer: `https://www.coupang.com/vp/products/${productId}`,
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
          options: review.itemName.split(", ").slice(1),
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
