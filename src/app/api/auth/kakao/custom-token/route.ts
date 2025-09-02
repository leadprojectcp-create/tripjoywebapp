import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin SDK 환경변수 누락:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey
      });
      throw new Error('Firebase Admin SDK 환경변수가 설정되지 않았습니다.');
    }

    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    console.log('✅ Firebase Admin SDK 초기화 완료');
  } catch (error) {
    console.error('❌ Firebase Admin SDK 초기화 실패:', error);
  }
}

// Firebase Admin SDK를 사용하여 카카오 사용자 인증 및 Custom Token 생성
async function createFirebaseCustomToken(kakaoUid: string, email: string, profileNickname: string, profileImage?: string) {
  try {
    console.log(`🔄 Firebase Custom Token 생성 시작: ${kakaoUid}, ${email}`);
    
    const auth = getAuth();
    
    // 1. 사용자 ID로 Firebase 사용자 검색
    let firebaseUser;
    let isNewUser = false;
    
    try {
      firebaseUser = await auth.getUserByEmail(email);
      console.log('📝 기존 사용자 발견:', firebaseUser.uid);
      
      // 기존 사용자 정보 업데이트
      await auth.updateUser(firebaseUser.uid, {
        displayName: profileNickname,
        photoURL: profileImage || '',
      });
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('📝 새 사용자 생성...');
        
        // 2. 새 사용자 생성
        firebaseUser = await auth.createUser({
          email: email,
          displayName: profileNickname,
          photoURL: profileImage || '',
          uid: `kakao_${kakaoUid}`,
        });
        
        isNewUser = true;
        console.log('✅ 새 사용자 생성 완료:', firebaseUser.uid);
        
      } else {
        throw error;
      }
    }
    
    // 3. Custom Token 생성
    const customToken = await auth.createCustomToken(firebaseUser.uid, {
      provider: 'kakao',
      kakao_uid: kakaoUid,
    });
    
    console.log('✅ Custom Token 생성 완료');
    
    return {
      success: true,
      customToken: customToken,
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
    
    // Firebase Custom Token 생성
    const result = await createFirebaseCustomToken(kakaoUid, email, profileNickname, profileImage);
    
    console.log('✅ 요청 처리 완료:', result);
    
    return NextResponse.json({
      success: true,
      customToken: result.customToken,
      uid: result.uid,
      isNewUser: result.isNewUser,
      message: '카카오 인증 및 Custom Token 생성이 완료되었습니다.'
    });
    
  } catch (error: any) {
    console.error('❌ API 오류:', error);
    
    return NextResponse.json(
      { 
        error: '서버 오류가 발생했습니다.',
        details: error.message || '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
