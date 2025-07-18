import axios from "axios";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Review } from "./type";

dotenv.config();

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const convertTimestampToYYYYMMDD = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const createProxyAgent = () => {
  const OXYLABS_PROXY_HOST = process.env.OXYLABS_PROXY_HOST || "pr.oxylabs.io";
  const OXYLABS_PROXY_PORT = process.env.OXYLABS_PROXY_PORT || "7777";
  const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME || "your_username";
  const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD || "your_password";

  const proxyUrl = `https://${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}@${OXYLABS_PROXY_HOST}:${OXYLABS_PROXY_PORT}`;
  return new HttpsProxyAgent(proxyUrl);
};

export const crawlWithAxios = async <T>(
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

const createExcelFileName = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `coupang_reviews_${timestamp}.xlsx`;
  return filename;
};

const createAllReviewSheet = (
  allProductReviews: { productId: string; reviews: Review[] }[],
  workbook: XLSX.WorkBook
) => {
  const allReviews: Review[] = [];
  allProductReviews.forEach((product) => {
    allReviews.push(...product.reviews);
  });

  const worksheet = XLSX.utils.json_to_sheet(allReviews);
  XLSX.utils.book_append_sheet(workbook, worksheet, "전체 리뷰");
};

const createEachReviewSheet = (
  allProductReviews: { productId: string; reviews: Review[] }[],
  workbook: XLSX.WorkBook
) => {
  allProductReviews.forEach((product) => {
    const worksheet = XLSX.utils.json_to_sheet(product.reviews);
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `제품 ${product.productId}`
    );
  });
};

export const createExcelFile = (
  allProductReviews: { productId: string; reviews: Review[] }[]
) => {
  const workbook = XLSX.utils.book_new();

  createAllReviewSheet(allProductReviews, workbook);
  createEachReviewSheet(allProductReviews, workbook);

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = createExcelFileName();
  const filepath = path.join(outputDir, filename);

  XLSX.writeFile(workbook, filepath);
  return filepath;
};
