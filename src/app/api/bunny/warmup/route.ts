import { NextRequest, NextResponse } from 'next/server';
import { bunnyService } from '../../../services/bunnyService';

export async function POST(request: NextRequest) {
  try {
    const { imageUrls } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json(
        { error: 'Image URLs array is required' },
        { status: 400 }
      );
    }

    console.log('🔥 Bunny.net CDN 캐시 워밍업 시작:', imageUrls.length, '개 이미지');

    // 이미지들을 병렬로 프리로드
    const preloadPromises = imageUrls.map(url => bunnyService.preloadImage(url));
    const results = await Promise.allSettled(preloadPromises);

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    console.log(`✅ 캐시 워밍업 완료: 성공 ${successful}개, 실패 ${failed}개`);

    return NextResponse.json({
      success: true,
      total: imageUrls.length,
      successful,
      failed
    });
  } catch (error) {
    console.error('❌ CDN 캐시 워밍업 실패:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
