import { NextRequest, NextResponse } from 'next/server';
import { bunnyService } from '../../../services/bunnyService';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Bunny.net 파일 삭제 요청:', fileUrl);

    // CDN URL에서 Storage Zone 경로 추출
    const cdnUrl = process.env.BUNNY_CDN_URL || 'https://tripjoy.b-cdn.net';
    const filePath = fileUrl.replace(cdnUrl, '');

    if (!filePath || filePath === fileUrl) {
      return NextResponse.json(
        { error: 'Invalid file URL' },
        { status: 400 }
      );
    }

    const success = await bunnyService.deleteFile(filePath);

    if (success) {
      console.log('✅ Bunny.net 파일 삭제 성공:', filePath);
      return NextResponse.json({ success: true });
    } else {
      console.error('❌ Bunny.net 파일 삭제 실패:', filePath);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Bunny.net 파일 삭제 에러:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
