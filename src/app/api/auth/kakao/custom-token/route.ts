import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    console.log('🔄 Firebase Admin SDK 초기화 시작...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('🔍 환경변수 확인:', {
      projectId: projectId ? '설정됨' : '누락',
      clientEmail: clientEmail ? '설정됨' : '누락',
      privateKey: privateKey ? '설정됨' : '누락'
    });

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin SDK 환경변수 누락:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey
      });
      throw new Error('Firebase Admin SDK 환경변수가 설정되지 않았습니다.');
    }

    console.log('🔧 Firebase Admin SDK 앱 초기화...');
    
    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    console.log('✅ Firebase Admin SDK 초기화 완료');
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK 초기화 실패:', error);
    console.error('❌ 초기화 오류 스택:', error.stack);
  }
} else {
  console.log('✅ Firebase Admin SDK 이미 초기화됨');
}

// Firebase Admin SDK를 사용하여 카카오 사용자 인증 및 Custom Token 생성 (Python 버전과 동일한 로직)
async function createFirebaseCustomToken(kakaoUid: string, email: string, profileNickname: string, profileImage?: string) {
  try {
    console.log(`🔄 Firebase Custom Token 생성 시작: ${kakaoUid}, ${email}`);
    
    const auth = getAuth();
    const db = getFirestore();
    let isNewUser = false;
    
    // 1. 먼저 카카오 UID로 새 사용자 생성 시도 (Python 로직과 동일)
    let firebaseUser;
    
    try {
      console.log('📝 새 사용자 생성 시도...');
      firebaseUser = await auth.createUser({
        uid: kakaoUid, // 카카오 UID 그대로 사용 (4425085307)
        email: email,
        emailVerified: true,
        displayName: profileNickname,
        photoURL: profileImage || '',
      });
      
      console.log('✅ 새 사용자 생성됨:', firebaseUser.uid);
      isNewUser = true;
      
    } catch (createError: any) {
      // 사용자가 이미 존재하면 업데이트 (Python except 로직과 동일)
      try {
        console.log('📝 기존 사용자 업데이트 시도...');
        firebaseUser = await auth.updateUser(kakaoUid, {
          email: email,
          emailVerified: true,
          displayName: profileNickname,
          photoURL: profileImage || '',
        });
        
        console.log('✅ 기존 사용자 업데이트됨:', firebaseUser.uid);
        
        // Firestore에 데이터가 있는지 확인
        const userDoc = await db.collection('users_test').doc(kakaoUid).get();
        isNewUser = !userDoc.exists;
        
        if (!userDoc.exists) {
          console.log('📝 Firebase Auth에는 있지만 Firestore DB에 데이터 없음 - 회원가입 완료 필요');
        } else {
          console.log('✅ Firebase Auth와 Firestore DB 모두 완료된 사용자');
        }
        
      } catch (updateError: any) {
        console.error('❌ 사용자 업데이트 실패:', updateError);
        throw updateError;
      }
    }
    
    // 2. Custom Token 생성 (Python claims와 동일)
    const claims = {
      provider: 'kakao',
      email: email,
      displayName: profileNickname,
      ...(profileImage && { photoURL: profileImage })
    };
    
    console.log('✅ 생성된 claims:', claims);
    
    const customToken = await auth.createCustomToken(kakaoUid, claims);
    
    console.log('✅ Custom Token 생성 완료');
    
    return {
      customToken: customToken,
      status: 'success',
      uid: firebaseUser.uid,
      isNewUser: isNewUser,
    };
    
  } catch (error) {
    console.error('❌ Firebase Custom Token 생성 오류:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 카카오 Custom Token API 시작');
    
    const requestData = await request.json();
    
    console.log('📥 수신된 요청 데이터:', requestData);
    
    // 파이썬 코드와 정확히 동일한 필드명 사용
    const kakaoUid = requestData.kakao_uid;
    const email = requestData.firebase_identifier;
    const profileNickname = requestData.profile_nickname;
    const profileImage = requestData.profile_image;
    
    console.log('🔍 추출된 데이터:', { 
      kakao_uid: kakaoUid, 
      firebase_identifier: email, 
      profile_nickname: profileNickname, 
      profile_image: profileImage 
    });
    
    // 필수 필드 검증
    if (!kakaoUid) {
      console.error('❌ kakao_uid 누락:', requestData);
      return NextResponse.json(
        { error: 'kakao_uid가 필요합니다.' },
        { status: 400 }
      );
    }
    
    if (!email) {
      console.error('❌ firebase_identifier 누락:', requestData);
      return NextResponse.json(
        { error: 'firebase_identifier가 필요합니다.' },
        { status: 400 }
      );
    }
    
    if (!profileNickname) {
      console.error('❌ profile_nickname 누락:', requestData);
      return NextResponse.json(
        { error: 'profile_nickname이 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Firebase Custom Token 생성 시작...');
    
    // Firebase Custom Token 생성
    const result = await createFirebaseCustomToken(kakaoUid, email, profileNickname, profileImage);
    
    console.log('✅ 요청 처리 완료:', result);
    
    // Python 버전과 동일한 응답 구조
    return NextResponse.json({
      customToken: result.customToken,
      status: 'success',
      uid: result.uid,
      isNewUser: result.isNewUser,
    });
    
  } catch (error: any) {
    console.error('❌ API 오류:', error);
    console.error('❌ 오류 스택:', error.stack);
    
    // Python 버전과 동일한 에러 응답 구조
    const errorMessage = `❌ 오류 발생: ${error.message || '알 수 없는 오류'}`;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        status: 'error'
      },
      { status: 500 }
    );
  }
}
