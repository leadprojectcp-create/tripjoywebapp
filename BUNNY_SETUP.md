# Bunny.net 설정 가이드

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수들을 추가하세요:

```bash
# Bunny.net Configuration
BUNNY_STORAGE_ZONE_NAME=tripjoy
BUNNY_STORAGE_PASSWORD=529a5878-2b3a-4ddb-aacb70439702-834b-4ccf
BUNNY_API_KEY=16de62a6-9b60-45ea-9e21-ef941fd4b9926c6f7dbb-c7f2-46c2-b127-13ac766b4333
BUNNY_CDN_URL=https://tripjoy.b-cdn.net
BUNNY_STORAGE_URL=https://storage.bunnycdn.com/tripjoy

# Firebase Configuration (기존 유지)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

## 마이그레이션 완료 사항

### ✅ 완료된 작업
1. **Bunny.net 서비스 생성** (`src/app/services/bunnyService.ts`)
2. **Bunny.net API 라우트 생성** (`src/app/api/bunny/`)
3. **postService.ts 마이그레이션** (ImageKit → Bunny.net)
4. **프로필 편집 페이지 마이그레이션**
5. **기존 ImageKit API 백업** (`src/app/api/imagekit_backup/`)

### 🔄 변경된 함수들
- `uploadImageToImageKit` → `uploadImageToBunny`
- `uploadVideoToImageKit` → `uploadVideoToBunny`
- `uploadMultipleImages` → `uploadMultipleImagesToBunny`
- `deleteImageFromImageKit` → `bunnyService.deleteFile`

### 📁 파일 구조
```
src/app/services/
├── bunnyService.ts (새로 생성)
├── bunnyImageService.ts (기존 imageKitService.ts에서 이름 변경)
└── postService.ts (Bunny.net으로 마이그레이션)

src/app/api/
├── bunny/
│   ├── upload/route.ts (새로 생성)
│   └── delete/route.ts (새로 생성)
└── imagekit_backup/ (기존 ImageKit API 백업)
```

## 테스트 방법

### 1. 이미지 업로드 테스트
```javascript
// 프로필 편집 페이지에서 이미지 업로드
// 게시물 업로드 페이지에서 이미지 업로드
```

### 2. 비디오 업로드 테스트
```javascript
// 게시물 업로드 페이지에서 비디오 업로드
```

### 3. URL 확인
```javascript
// 업로드된 파일의 URL이 https://tripjoy.b-cdn.net/ 로 시작하는지 확인
```

### 4. 이미지 로딩 성능 테스트
```javascript
// 이미지 프리로딩이 작동하는지 확인
// CDN 캐시 워밍업 API 테스트
```

## 성능 최적화 기능

### ✅ 추가된 최적화 기능
1. **이미지 프리로딩** - 컴포넌트 마운트 시 썸네일 미리 로드
2. **CDN 캐시 워밍업** - `/api/bunny/warmup` 엔드포인트
3. **이미지 로딩 최적화** - GPU 가속, 부드러운 페이드인
4. **OptimizedImage 컴포넌트** - 로딩 상태 관리
5. **Bunny.net 최적화 파라미터** - `cache=1&optimize=1`

### 🚀 성능 향상 방법
1. **첫 로딩**: CDN 캐시가 없어서 느릴 수 있음
2. **두 번째 로딩**: 캐시된 이미지로 빠른 로딩
3. **프리로딩**: 다음 이미지들을 미리 로드하여 끊김 없는 경험

## 주의사항

1. **환경 변수 설정**: `.env.local` 파일에 Bunny.net 설정을 추가해야 합니다.
2. **완전한 마이그레이션**: ImageKit 관련 코드가 모두 제거되었습니다.
3. **Bunny.net 전용**: 모든 이미지와 비디오는 Bunny.net을 사용합니다.
4. **비디오 썸네일**: 비디오 URL을 썸네일로 사용합니다.

## 다음 단계

1. ✅ 환경 변수 설정 (완료)
2. ✅ apphosting.yaml 설정 (완료)
3. ✅ API 키 추가 (완료)
4. 테스트 업로드
5. 기존 ImageKit 데이터 마이그레이션 (선택사항)
6. ImageKit 계정 해지 (모든 데이터 마이그레이션 후)

## 환경 변수 확인

다음 환경 변수들이 모두 설정되었는지 확인하세요:

- ✅ `BUNNY_STORAGE_ZONE_NAME=tripjoy`
- ✅ `BUNNY_STORAGE_PASSWORD=529a5878-2b3a-4ddb-aacb70439702-834b-4ccf`
- ✅ `BUNNY_API_KEY=16de62a6-9b60-45ea-9e21-ef941fd4b9926c6f7dbb-c7f2-46c2-b127-13ac766b4333`
- ✅ `BUNNY_CDN_URL=https://tripjoy.b-cdn.net`
- ✅ `BUNNY_STORAGE_URL=https://storage.bunnycdn.com/tripjoy`
