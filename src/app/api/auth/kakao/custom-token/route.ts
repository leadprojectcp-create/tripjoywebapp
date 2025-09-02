import { NextRequest, NextResponse } from 'next/server';

// Firebase Auth REST API를 사용하여 Custom Token 생성
async function createCustomTokenWithREST(uid: string, claims: any) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const endpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signInWithCustomToken`;
  
  // Firebase Auth REST API 호출
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: uid, // 임시로 uid를 token으로 사용
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase Auth API 오류: ${response.statusText}`);
  }

  const data = await response.json();
  return data.idToken; // ID Token 반환
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userInfo } = await request.json();
    
    console.log('🔄 카카오 사용자 정보로 Firebase 인증 처리:', { userInfo });
    
    // 카카오 사용자 정보로 Firebase 사용자 생성/로그인
    const uid = `kakao_${userInfo.id}`;
    
    // Firebase Auth REST API를 사용하여 Custom Token 생성
    const customToken = await createCustomTokenWithREST(uid, {
      provider: 'kakao',
      kakaoId: userInfo.id,
      email: userInfo.kakao_account?.email,
      name: userInfo.properties?.nickname,
      picture: userInfo.properties?.profile_image,
    });
    
    console.log('✅ Firebase 인증 처리 완료');
    
    return NextResponse.json({ 
      customToken,
      user: {
        uid,
        email: userInfo.kakao_account?.email,
        name: userInfo.properties?.nickname,
        picture: userInfo.properties?.profile_image,
        provider: 'kakao'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Firebase 인증 처리 실패:', error);
    return NextResponse.json(
      { error: 'Firebase 인증 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}
