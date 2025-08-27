import { NextResponse } from 'next/server';
import crypto from 'crypto';

const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

export async function GET() {
  try {
    if (!IMAGEKIT_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'ImageKit private key not configured' },
        { status: 500 }
      );
    }

    // 만료 시간: 현재 시간 + 10분
    const expire = Math.floor(Date.now() / 1000) + (10 * 60);
    
    // 고유 토큰 생성
    const token = crypto.randomBytes(16).toString('hex');
    
    // 서명 생성: token + expire를 private key로 해싱
    const signature = crypto
      .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
      .update(token + expire)
      .digest('hex');

    return NextResponse.json({
      signature,
      expire,
      token,
    });
  } catch (error) {
    console.error('ImageKit 인증 토큰 생성 실패:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth token' },
      { status: 500 }
    );
  }
}
