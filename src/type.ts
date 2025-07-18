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
