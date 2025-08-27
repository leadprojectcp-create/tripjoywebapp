# TRIPJOY - 여행 이상의 연결

이 프로젝트는 [Next.js](https://nextjs.org)로 구축된 여행 커뮤니티 웹 애플리케이션입니다.

## 주요 기능

- 🔐 **회원가입/로그인**: 이메일, 카카오톡, 구글, 애플 로그인 지원
- 📱 **반응형 디자인**: 모바일과 데스크톱에서 최적화된 UI
- 🌍 **다국어 지원**: 한국어, 영어 등 다국어 지원
- 🔥 **Firebase 연동**: Firebase Auth 및 Firestore를 통한 사용자 관리

## 회원가입 플로우

1. **회원가입 방법 선택**: 이메일, 카카오톡, 구글, 애플 중 선택
2. **이메일 입력** (이메일 가입 시): 이메일 주소 입력
3. **약관 동의**: 필수 약관 및 선택 약관 동의
4. **회원정보 입력**: 휴대폰 번호, 생년월일, 성별, 추천인 코드
5. **Firebase 저장**: Firebase Auth 및 Firestore에 사용자 정보 저장

## Getting Started

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 Firebase 설정을 추가하세요:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 프로덕션 배포

### Firebase App Hosting 배포

1. **Firebase CLI 설치** (아직 설치하지 않은 경우)
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase 로그인**
   ```bash
   firebase login
   ```

3. **프로젝트 빌드**
   ```bash
   npm run build:prod
   ```

4. **Firebase App Hosting에 배포**
   ```bash
   npm run deploy
   ```

### 프리뷰 배포

개발 중인 기능을 미리 확인하려면:
```bash
npm run deploy:preview
```

### 로컬 테스트

배포 전 로컬에서 테스트:
```bash
npm run build:prod
npm run start:prod
```

## 보안 기능

- ✅ **입력 데이터 검증**: 이메일, 비밀번호, 휴대폰 번호 등 모든 입력 검증
- ✅ **XSS 방지**: 입력 데이터 정제 및 HTML 태그 제거
- ✅ **보안 헤더**: X-Frame-Options, X-Content-Type-Options 등 설정
- ✅ **에러 처리**: 민감한 정보가 노출되지 않는 안전한 에러 메시지
- ✅ **환경 변수 검증**: 필수 환경 변수 누락 시 빌드 실패

## 모니터링

- **헬스체크**: `/api/health` 엔드포인트로 서비스 상태 확인
- **에러 로깅**: 개발/프로덕션 환경별 차별화된 에러 로깅
- **성능 최적화**: 이미지 최적화, 번들 크기 최적화

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
