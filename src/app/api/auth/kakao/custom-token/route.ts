import { NextRequest, NextResponse } from 'next/server';

// 카카오 ID 토큰으로 Firebase OIDC 인증
async function authenticateWithFirebaseOIDC(idToken: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  try {
    // Firebase OIDC 엔드포인트로 카카오 ID 토큰 검증
    const oidcEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signInWithIdp`;
    
    const response = await fetch(`${oidcEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postBody: `id_token=${idToken}&providerId=oidc.kakao`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Firebase OIDC 응답 오류:', errorData);
      throw new Error(`Firebase OIDC 오류: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('Firebase OIDC 응답 성공:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Firebase OIDC 인증 오류:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'ID 토큰이 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Firebase OIDC를 통한 카카오 인증 처리 시작');
    
    // Firebase OIDC로 카카오 사용자 인증
    const authResult = await authenticateWithFirebaseOIDC(idToken);
    
    console.log('✅ Firebase OIDC 인증 완료');
    
    return NextResponse.json({ 
      success: true,
      user: {
        uid: authResult.data.localId,
        email: authResult.data.email,
        name: authResult.data.displayName,
        picture: authResult.data.photoUrl,
        provider: 'kakao'
      },
      firebaseData: authResult.data
    });
    
  } catch (error: any) {
    console.error('❌ Firebase OIDC 인증 실패:', error);
    return NextResponse.json(
      { 
        error: 'Firebase OIDC 인증에 실패했습니다.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
