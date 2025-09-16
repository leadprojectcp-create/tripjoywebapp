import { NextRequest, NextResponse } from 'next/server';
import { bunnyService } from '../../../services/bunnyService';
import { bunnyStreamService } from '../../../services/bunnyStreamService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image' | 'video' | 'video-stream'
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

    const folder = `tripjoy/${postId}`;

    // Bunny Stream 환경변수 가드 (로컬 개발 시 누락되는 경우 500 -> 원인 메시지)
    if (type === 'video-stream') {
      const missing: string[] = [];
      if (!process.env.BUNNY_STREAM_LIBRARY_ID) missing.push('BUNNY_STREAM_LIBRARY_ID');
      if (!process.env.BUNNY_STREAM_API_KEY) missing.push('BUNNY_STREAM_API_KEY');
      if (!process.env.BUNNY_STREAM_CDN_BASE) missing.push('BUNNY_STREAM_CDN_BASE');
      if (missing.length) {
        console.error('❌ Bunny Stream env missing:', missing);
        return NextResponse.json({ error: `Bunny Stream env missing: ${missing.join(', ')}` }, { status: 500 });
      }
    }

    // Bunny Stream 경로: 비디오 생성 -> 바이너리 업로드 -> HLS/포스터 URL 반환
    if (type === 'video-stream') {
      const created = await bunnyStreamService.createVideo(`${postId}-${Date.now()}`);
      if (!created.success || !created.videoId) {
        console.error('❌ Bunny Stream 비디오 생성 실패:', created.error);
        return NextResponse.json({ error: created.error || 'Stream create failed' }, { status: 500 });
      }

      const uploaded = await bunnyStreamService.uploadVideoBinary(created.videoId, file);
      if (!uploaded.success) {
        console.error('❌ Bunny Stream 업로드 실패:', uploaded.error);
        return NextResponse.json({ error: uploaded.error || 'Stream upload failed' }, { status: 500 });
      }

      const hlsUrl = bunnyStreamService.buildHlsUrl(created.videoId);
      const posterUrl = bunnyStreamService.buildPosterUrl(created.videoId, 600);

      console.log('✅ Bunny Stream 업로드 성공:', { videoId: created.videoId, hlsUrl, posterUrl });
      return NextResponse.json({
        success: true,
        videoId: created.videoId,
        url: hlsUrl,
        posterUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
    }

    // 기본: Storage CDN 업로드 (이미지/비디오)
    let result;
    if (type === 'video') {
      result = await bunnyService.uploadVideo(file, `${folder}/videos`);
    } else {
      result = await bunnyService.uploadImage(file, `${folder}/images`);
    }

    if (!result.success || !result.url) {
      console.error('❌ Bunny.net 업로드 실패:', result.error);
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    console.log('✅ Bunny.net 업로드 성공:', result.url);
    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
  } catch (error) {
    console.error('❌ Bunny.net 업로드 에러:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
