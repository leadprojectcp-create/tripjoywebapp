import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    console.log('🔄 Firebase Admin SDK 초기화 시작...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Firebase Admin SDK 환경변수 누락');
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
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK 초기화 실패:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 FCM 토큰 저장 API 시작');
    
    const requestData = await request.json();
    
    console.log('📥 수신된 요청 데이터:', {
      userId: requestData.userId,
      token: requestData.token ? requestData.token.substring(0, 20) + '...' : '없음',
      platform: requestData.platform
    });
    
    const { userId, token, platform } = requestData;
    
    // 필수 필드 검증
    if (!userId) {
      console.error('❌ userId 누락:', requestData);
      return NextResponse.json(
        { error: 'userId가 필요합니다.' },
        { status: 400 }
      );
    }
    
    if (!token) {
      console.error('❌ token 누락:', requestData);
      return NextResponse.json(
        { error: 'token이 필요합니다.' },
        { status: 400 }
      );
    }
    
    if (!platform) {
      console.error('❌ platform 누락:', requestData);
      return NextResponse.json(
        { error: 'platform이 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Firestore에 FCM 토큰 저장 시작...');
    
    const db = getFirestore();
    
    // FCM 토큰을 Firestore에 저장
    await db.collection('fcm_tokens').doc(userId).set({
      userId,
      token,
      platform,
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log('✅ FCM 토큰 저장 완료:', userId);
    
    return NextResponse.json({
      success: true,
      message: 'FCM 토큰이 성공적으로 저장되었습니다.',
      userId
    });
    
  } catch (error: any) {
    console.error('❌ FCM 토큰 저장 오류:', error);
    console.error('❌ 오류 스택:', error.stack);
    
    return NextResponse.json(
      { 
        error: `FCM 토큰 저장 실패: ${error.message || '알 수 없는 오류'}`,
        success: false
      },
      { status: 500 }
    );
  }
}
