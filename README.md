# syncly-software-engineer-intern

싱클리 소프트웨어 인턴 과제

## 🚀 TypeScript 쿠팡 리뷰 크롤러

Oxylabs Residential Proxy를 사용하여 쿠팡 상품 리뷰를 수집하는 TypeScript 크롤러입니다.

### 📋 기능

- 여러 상품의 리뷰를 동시에 수집
- 각 상품당 최대 1,500개 리뷰 수집 (15페이지 × 10개)
- Oxylabs Residential Proxy 사용으로 IP 차단 방지
- 요청 간 지연 시간 설정 (기본 10초)
- 엑셀 파일로 결과 저장

### 🔧 설정 방법

1. **환경 설정 파일 생성**

   ```bash
   cp .env.example .env
   ```

2. **Oxylabs 프록시 정보 입력**
   `.env` 파일에서 다음 값들을 실제 Oxylabs 계정 정보로 변경하세요:

   ```
   OXYLABS_PROXY_HOST=pr.oxylabs.io
   OXYLABS_PROXY_PORT=7777
   OXYLABS_USERNAME=your_actual_username
   OXYLABS_PASSWORD=your_actual_password
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

## 실행 환경

Node.js

## 실행 방법

```bash
# 개발 모드로 실행
npm run dev

# 또는 빌드 후 실행
npm run build
npm start
```

### 📊 결과 파일

- `output/` 디렉토리에 엑셀 파일이 생성됩니다
- 파일명: `coupang_reviews_YYYY-MM-DDTHH-MM-SS.xlsx`
- 전체 리뷰 시트와 각 상품별 시트가 포함됩니다

### 🛡️ 주의사항

- 실제 Oxylabs 계정과 프록시 정보가 필요합니다
- 과도한 요청은 서비스 약관 위반이 될 수 있습니다
- 적절한 지연 시간을 설정하여 사용하세요

```
npm install
npm run dev
```

## 참고 사항

각 리뷰가 끝난 이후에는 3000ms의 delay를 주어 limit rate로 인한 IP 밴을 방지

제품 당 최대 150 페이지이므로 제품 당 최대 소요시간은 7.5분 이번 과제에서는 제품이 5개이기 때문에 최대 37.5분이 소요될 수 있다.

병렬 실행의 경우 <br>
-> 각 제품 별로 병렬로 실행하는 것이 좋다고 판단

-> 단, 이러한 방식으로 구현하는 경우에는 제품별 접속 IP를 다르게하는 것이 좋다고 판단

각 페이지의 size를 10으로 결정한 이유 <br>
-> 쿠팡 사이트에서 리뷰를 확인하는 경우 리뷰가 10개씩 보여지는 페이지네이션 방식으로 구현되어 있음

![쿠팡 리뷰 페이지네이션](image.png)

-> 따라서, 유저가 사이트를 방문할 때와 최대한 유사한 방식으로 접근하는 것이 좋다고 판단

- HTTP 요청을 보낼 때 HTTP header의 Referer을 각 제품에 맡게 설정해야한다 (다만 postman으로 요청 시에는 Referer이 없어도 응답이 잘 오는데 이유를 아직 찾지 못했음)

## IP Proxy

처음에는 IP Proxy가 없어도 된다고 판단하여 없이 구현하였으나 요청의 갯수가 많아지면 500 에러가 종종 발생하는 상황을 맞닥뜨려 IP Proxy을 도입하게 되었음
