import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    console.log('🔄 Firebase Admin SDK 초기화 시작...');
    
    // 환경 변수에서 서비스 계정 키 가져오기
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    
    if (!serviceAccount.project_id) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.');
    }
    
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log('✅ Firebase Admin SDK 초기화 완료');
  } catch (error) {
    console.error('❌ Firebase Admin SDK 초기화 실패:', error);
  }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

/**
 * 통합 사용자 관리 API
 * - 사용자 존재 확인
 * - 이메일 사용자 생성
 * - 소셜 사용자 생성  
 * - 카카오 Custom Token 생성
 * - 사용자 정보 업데이트 (약관 동의 + 추가 정보)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    console.log('🚀 사용자 관리 API 호출:', { action });
    
    switch (action) {
      case 'check-user':
        return await checkUser(body);
      case 'create-email-user':
        return await createEmailUser(body);
      case 'create-social-user':
        return await createSocialUser(body);
      case 'create-kakao-token':
        return await createKakaoToken(body);
      case 'update-user-info':
        return await updateUserInfo(body);
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ 사용자 관리 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 한국 시간대 기준 타임스탬프 포맷팅 함수
const formatKoreanTimestamp = (date: Date): string => {
  const koreaTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  
  const year = koreaTime.getFullYear();
  const month = koreaTime.getMonth() + 1;
  const day = koreaTime.getDate();
  const hours = koreaTime.getHours();
  const minutes = koreaTime.getMinutes();
  const seconds = koreaTime.getSeconds();
  
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  
  return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}시 ${minutes}분 ${seconds}초 UTC+9`;
};

// 기존 방식: 국가코드에 따른 언어 및 위치 설정 (지원하는 7개 언어만)
const getLanguageAndLocationByCountryCode = (countryCode: string): { language: string, location: string } => {
  switch (countryCode) {
    case '+82': return { language: 'ko', location: 'ko' };  // 한국
    case '+1': return { language: 'en', location: 'en' };   // 미국
    case '+84': return { language: 'vi', location: 'vi' };  // 베트남
    case '+86': return { language: 'zh', location: 'zh' };  // 중국
    case '+81': return { language: 'ja', location: 'ja' };  // 일본
    case '+66': return { language: 'th', location: 'th' };  // 태국
    case '+63': return { language: 'fil', location: 'fil' }; // 필리핀
    default: return { language: 'en', location: 'en' };     // 기본값
  }
};

/**
 * 1. 사용자 존재 확인
 */
async function checkUser(body: any) {
  const { uid, kakao_uid, google_uid, apple_uid } = body;
  
  try {
    let userDoc;
    
    if (uid) {
      // Firebase UID로 검색
      userDoc = await adminDb.collection('users').doc(uid).get();
    } else if (kakao_uid) {
      // 카카오 UID로 검색 (uid 필드 직접 검색)
      console.log('🔍 카카오 UID로 사용자 검색:', kakao_uid);
      userDoc = await adminDb.collection('users').doc(kakao_uid).get();
    } else if (google_uid) {
      // 구글 UID로 검색 (uid 필드 직접 검색)
      console.log('🔍 구글 UID로 사용자 검색:', google_uid);
      userDoc = await adminDb.collection('users').doc(google_uid).get();
    } else if (apple_uid) {
      // 애플 UID로 검색 (uid 필드 직접 검색)
      console.log('🔍 애플 UID로 사용자 검색:', apple_uid);
      userDoc = await adminDb.collection('users').doc(apple_uid).get();
    }
    
    const exists = userDoc && userDoc.exists;
    const data = exists && userDoc ? userDoc.data() : null;
    
    console.log('🔍 사용자 존재 확인 결과:', { 
      exists, 
      uid, 
      kakao_uid, 
      google_uid, 
      apple_uid,
      isTemporary: data?.isTemporary,
      hasData: !!data
    });
    
    return NextResponse.json({
      exists,
      data
    });
    
  } catch (error) {
    console.error('❌ 사용자 확인 실패:', error);
    return NextResponse.json(
      { success: false, error: '사용자 확인에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 2. 이메일 사용자 생성
 */
async function createEmailUser(body: any) {
  const { email, password, userInfo } = body;
  
  try {
    // Firebase Auth에서 사용자 생성
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: userInfo.name,
    });
    
    console.log('✅ Firebase Auth 사용자 생성 성공:', userRecord.uid);
    
    // 생년월일을 타임스탬프로 변환
    const birthDate = new Date(
      parseInt(userInfo.birthYear), 
      parseInt(userInfo.birthMonth) - 1, 
      parseInt(userInfo.birthDay)
    );
    
    const currentTime = new Date();
    
    // 국가코드에 따른 언어 및 위치 설정 (기존 방식)
    const { language, location } = getLanguageAndLocationByCountryCode(userInfo.countryCode);

    // Firestore에 사용자 정보 저장
    const userData = {
      id: userRecord.uid,
      name: userInfo.name,
      email: email,
      phoneNumber: userInfo.countryCode + userInfo.phoneNumber,
      birthDate: formatKoreanTimestamp(birthDate),
      gender: userInfo.gender === 'male' ? '남성' : '여성',
      location: location, // 기존 방식 적용

      referralCode: userInfo.referralCode || '',
      referredBy: null,
      signupMethod: 'email',
      loginType: 'email',
      photoUrl: '',
      
      points: 3000,
      usage_count: 0,
      
      language: language, // 기존 방식 적용
      fcmToken: '',
      
      consents: {
        termsOfService: userInfo.consents.termsOfService,
        personalInfo: userInfo.consents.personalInfo,
        locationInfo: userInfo.consents.locationInfo,
        marketing: userInfo.consents.marketing,
        thirdParty: userInfo.consents.thirdParty
      },
      
      createdAt: formatKoreanTimestamp(currentTime),
      updatedAt: formatKoreanTimestamp(currentTime),
      lastUpdated: formatKoreanTimestamp(currentTime),
      lastLoginAt: formatKoreanTimestamp(currentTime),
      tokenUpdatedAt: formatKoreanTimestamp(currentTime)
    };
    
    await adminDb.collection('users').doc(userRecord.uid).set(userData);
    
    return NextResponse.json({
      success: true,
      userData,
      uid: userRecord.uid
    });
    
  } catch (error: any) {
    console.error('❌ 이메일 사용자 생성 실패:', error);
    
    let errorMessage = '회원가입에 실패했습니다.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = '이미 사용 중인 이메일입니다.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '유효하지 않은 이메일 형식입니다.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '비밀번호가 너무 약합니다.';
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 3. 소셜 사용자 생성 (구글/애플)
 */
async function createSocialUser(body: any) {
  const { uid, email, displayName, signupMethod } = body;
  
  try {
    const currentTime = new Date();
    
    // 기본 사용자 데이터 (약관 동의 전 상태)
    const userData = {
      id: uid,
      name: displayName || email?.split('@')[0] || '사용자',
      email: email || '',
      phoneNumber: '', // 약관 동의 후 입력
      birthDate: '', // 약관 동의 후 입력
      gender: '', // 약관 동의 후 입력
      location: '', // 약관 동의 후 입력
      
      referralCode: '',
      referredBy: null,
      signupMethod: signupMethod,
      loginType: signupMethod,
      photoUrl: '',
      
      points: 3000,
      usage_count: 0,
      
      language: 'ko',
      fcmToken: '',
      
      // 동의 관련 (아직 미동의 상태)
      consents: {
        termsOfService: false,
        personalInfo: false,
        locationInfo: false,
        marketing: false,
        thirdParty: false
      },
      
      createdAt: formatKoreanTimestamp(currentTime),
      updatedAt: formatKoreanTimestamp(currentTime),
      lastUpdated: formatKoreanTimestamp(currentTime),
      lastLoginAt: formatKoreanTimestamp(currentTime),
      tokenUpdatedAt: formatKoreanTimestamp(currentTime),
      
      // 임시 사용자 플래그 (약관 동의 완료 후 제거)
      isTemporary: true
    };
    
    await adminDb.collection('users').doc(uid).set(userData);
    
    return NextResponse.json({
      success: true,
      userData
    });
    
  } catch (error) {
    console.error('❌ 소셜 사용자 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: '사용자 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 4. 카카오 Custom Token 생성 (기존 로직)
 */
async function createKakaoToken(body: any) {
  // 기존 kakao/custom-token 로직을 여기로 이동
  // 지금은 기존 API 유지하고, 나중에 통합
  return NextResponse.json({
    success: false,
    error: '카카오 토큰 생성은 기존 API를 사용하세요: /api/auth/kakao/custom-token'
  });
}

/**
 * 5. 사용자 정보 업데이트 (약관 동의 + 추가 정보)
 */
async function updateUserInfo(body: any) {
  const { uid, userInfo } = body;
  
  try {
    console.log('🔄 사용자 정보 업데이트:', { uid, userInfo });
    
    const currentTime = new Date();
    
    // 생년월일을 타임스탬프로 변환
    const birthDate = new Date(
      parseInt(userInfo.birthYear), 
      parseInt(userInfo.birthMonth) - 1, 
      parseInt(userInfo.birthDay)
    );
    
    // 국가코드에 따른 언어 및 위치 설정 (기존 방식)
    const { language, location } = getLanguageAndLocationByCountryCode(userInfo.countryCode);
    
    // 업데이트할 데이터
    const updateData = {
      name: userInfo.name,
      phoneNumber: userInfo.countryCode + userInfo.phoneNumber,
      birthDate: formatKoreanTimestamp(birthDate),
      gender: userInfo.gender === 'male' ? '남성' : '여성',
      location: location, // 기존 방식 적용
      language: language, // 기존 방식 적용
      
      // 약관 동의 정보
      consents: {
        termsOfService: userInfo.consents.termsOfService,
        personalInfo: userInfo.consents.personalInfo,
        locationInfo: userInfo.consents.locationInfo,
        marketing: userInfo.consents.marketing,
        thirdParty: userInfo.consents.thirdParty
      },
      
      // 임시 사용자 플래그 제거
      isTemporary: false,
      
      // 타임스탬프 업데이트
      updatedAt: formatKoreanTimestamp(currentTime),
      lastUpdated: formatKoreanTimestamp(currentTime)
    };
    
    // Firestore 업데이트
    await adminDb.collection('users').doc(uid).update(updateData);
    
    // 업데이트된 사용자 정보 가져오기
    const updatedUserDoc = await adminDb.collection('users').doc(uid).get();
    const updatedUserData = updatedUserDoc.data();
    
    console.log('✅ 사용자 정보 업데이트 완료:', uid);
    
    return NextResponse.json({
      success: true,
      userData: updatedUserData
    });
    
  } catch (error) {
    console.error('❌ 사용자 정보 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: '사용자 정보 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
