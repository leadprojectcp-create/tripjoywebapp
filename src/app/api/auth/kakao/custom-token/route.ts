import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userInfo } = await request.json();
    
    console.log('🔄 Firebase Custom Token 생성 요청:', { accessToken, userInfo });
    
    // 카카오 사용자 ID로 Firebase Custom Token 생성
    const customToken = await getAuth().createCustomToken(userInfo.id.toString(), {
      provider: 'kakao',
      kakaoId: userInfo.id,
      email: userInfo.kakao_account?.email,
      name: userInfo.properties?.nickname,
      picture: userInfo.properties?.profile_image,
    });
    
    console.log('✅ Firebase Custom Token 생성 완료');
    
    return NextResponse.json({ customToken });
    
  } catch (error: any) {
    console.error('❌ Firebase Custom Token 생성 실패:', error);
    return NextResponse.json(
      { error: 'Custom Token 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
