import { HttpsProxyAgent } from "https-proxy-agent";

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
