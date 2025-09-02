import { NextRequest, NextResponse } from 'next/server';

// Firebase Auth REST API를 사용하여 카카오 사용자 인증
async function authenticateWithFirebase(userInfo: any) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  // 카카오 사용자 정보로 Firebase 사용자 생성/로그인
  const uid = `kakao_${userInfo.id}`;
  const email = userInfo.kakao_account?.email;
  
  try {
    // 먼저 기존 사용자 확인
    const signInEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signInWithPassword`;
    
    // 임시 비밀번호로 로그인 시도 (실제로는 OIDC 토큰 검증 필요)
    const signInResponse = await fetch(`${signInEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || `${uid}@kakao.temp`,
        password: `kakao_${userInfo.id}_temp_password`,
        returnSecureToken: true,
      }),
    });

    if (signInResponse.ok) {
      const data = await signInResponse.json();
      return { success: true, data, uid };
    }

    // 사용자가 없으면 생성
    const signUpEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp`;
    const signUpResponse = await fetch(`${signUpEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || `${uid}@kakao.temp`,
        password: `kakao_${userInfo.id}_temp_password`,
        returnSecureToken: true,
      }),
    });

    if (signUpResponse.ok) {
      const data = await signUpResponse.json();
      return { success: true, data, uid };
    }

    throw new Error('Firebase 사용자 생성/로그인 실패');
    
  } catch (error) {
    console.error('Firebase 인증 오류:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userInfo } = await request.json();
    
    console.log('🔄 카카오 사용자 정보로 Firebase 인증 처리:', { userInfo });
    
    // Firebase Auth REST API를 사용하여 인증
    const authResult = await authenticateWithFirebase(userInfo);
    
    console.log('✅ Firebase 인증 처리 완료');
    
    return NextResponse.json({ 
      success: true,
      uid: authResult.uid,
      user: {
        uid: authResult.uid,
        email: userInfo.kakao_account?.email,
        name: userInfo.properties?.nickname,
        picture: userInfo.properties?.profile_image,
        provider: 'kakao'
      },
      firebaseData: authResult.data
    });
    
  } catch (error: any) {
    console.error('❌ Firebase 인증 처리 실패:', error);
    return NextResponse.json(
      { 
        error: 'Firebase 인증 처리에 실패했습니다.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
