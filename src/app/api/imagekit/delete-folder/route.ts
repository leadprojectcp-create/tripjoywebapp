import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

// ImageKit 인스턴스 생성
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_ENDPOINT || '',
});

export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();

    if (!folderPath) {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      );
    }

    console.log('🗂️ ImageKit 폴더 삭제 요청:', folderPath);

    // ImageKit 설정 확인
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_ENDPOINT;
    
    console.log('🔧 ImageKit 설정 확인:', {
      privateKey: privateKey ? `${privateKey.substring(0, 15)}...` : '❌ 없음',
      publicKey: publicKey ? `${publicKey.substring(0, 15)}...` : '❌ 없음',
      endpoint: endpoint || '❌ 없음'
    });

    if (!privateKey || !publicKey || !endpoint) {
      console.error('❌ ImageKit 환경 변수가 설정되지 않았습니다');
      return NextResponse.json(
        { error: 'ImageKit configuration missing' },
        { status: 500 }
      );
    }

    // 1. 폴더 내 남은 파일 확인
    console.log('📁 폴더 내 남은 파일 확인:', folderPath);
    
    const listResult = await imagekit.listFiles({
      path: folderPath,
      includeFolder: false // 파일만 조회
    });

    console.log(`📋 폴더 내 남은 파일 개수: ${listResult.length}개`);

    // 2. 남은 파일이 있으면 경고 메시지
    if (listResult.length > 0) {
      console.warn(`⚠️ 폴더에 아직 ${listResult.length}개의 파일이 남아있습니다. 개별 이미지 삭제를 먼저 완료해주세요.`);
      
      return NextResponse.json({
        success: false,
        message: `폴더에 아직 ${listResult.length}개의 파일이 남아있습니다.`,
        details: {
          remainingFiles: listResult.length,
          folderPath,
          files: listResult.map(f => f.name)
        }
      });
    }

    // 3. 빈 폴더 처리 (ImageKit에서는 빈 폴더가 자동으로 삭제됨)
    console.log('✅ 폴더가 비어있습니다. 자동으로 정리됩니다.');

    return NextResponse.json({
      success: true,
      message: `빈 폴더 확인 완료: ${folderPath}`,
      details: {
        totalFiles: 0,
        successCount: 0,
        failCount: 0,
        folderPath,
        note: '빈 폴더는 ImageKit에서 자동으로 삭제됩니다.'
      }
    });

  } catch (error: any) {
    console.error('❌ ImageKit 폴더 삭제 실패:', error);
    
    return NextResponse.json(
      { 
        error: 'ImageKit folder deletion failed',
        details: error.message,
        errorCode: error.errorCode || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}
