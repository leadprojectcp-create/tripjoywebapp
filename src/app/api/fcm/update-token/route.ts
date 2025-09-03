import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDK 초기화
if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
  } catch (error) {
    // 에러 무시
  }
}

/**
 * FCM 토큰 저장 API
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, fcmToken } = await request.json();
    
    if (!userId || !fcmToken) {
      return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    
    const updateData = {
      fcmToken: fcmToken,
      fcmTokenUpdatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    try {
      await userRef.update(updateData);
    } catch (updateError: any) {
      // 문서가 없는 경우 생성
      if (updateError.code === 'not-found' || updateError.code === 5) {
        await userRef.set(updateData, { merge: true });
      } else {
        throw updateError;
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}