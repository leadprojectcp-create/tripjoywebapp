import { NextRequest, NextResponse } from 'next/server';
import { bunnyService } from '../../../services/bunnyService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image' or 'video'
    const postId = formData.get('postId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    console.log('📤 Bunny.net 업로드 요청:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadType: type,
      postId: postId
    });

    let result;
    const folder = `tripjoy/${postId}`;

    if (type === 'video') {
      result = await bunnyService.uploadVideo(file, `${folder}/videos`);
    } else {
      result = await bunnyService.uploadImage(file, `${folder}/images`);
    }

    if (result.success && result.url) {
      console.log('✅ Bunny.net 업로드 성공:', result.url);
      
      return NextResponse.json({
        success: true,
        url: result.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    } else {
      console.error('❌ Bunny.net 업로드 실패:', result.error);
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Bunny.net 업로드 에러:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
