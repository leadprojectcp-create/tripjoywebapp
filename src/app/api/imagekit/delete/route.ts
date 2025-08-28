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
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ ImageKit 이미지 삭제 요청:', imageUrl);

    // ImageKit 설정 확인
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_ENDPOINT;
    
    console.log('🔧 ImageKit 설정 확인:', {
      privateKey: privateKey ? `${privateKey.substring(0, 15)}...` : '❌ 없음',
      publicKey: publicKey ? `${publicKey.substring(0, 15)}...` : '❌ 없음',
      endpoint: endpoint || '❌ 없음'
    });
    
    if (!privateKey) {
      console.error('❌ ImageKit Private Key가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'ImageKit configuration error' },
        { status: 500 }
      );
    }

    // 방법 1: URL에서 fileId 추출
    let fileId = extractFileIdFromUrl(imageUrl);
    let deleteResult;
    
    if (!fileId) {
      console.error('❌ FileId 추출 실패:', imageUrl);
      return NextResponse.json(
        { error: 'Cannot extract fileId from URL' },
        { status: 400 }
      );
    }

    console.log('🔍 추출된 FileId:', fileId);

    try {
      // 방법 1: 파일 목록에서 검색하여 정확한 fileId 찾기
      console.log('🔍 ImageKit 파일 목록에서 검색 중...');
      
      const fileName = fileId.split('/').pop()?.replace(/\.[^/.]+$/, ''); // 확장자 제거한 파일명
      console.log('📝 검색할 파일명:', fileName);
      
      const listResult = await imagekit.listFiles({
        path: fileId.substring(0, fileId.lastIndexOf('/')), // 폴더 경로만
        limit: 50
      });
      
      console.log('📋 검색된 파일 목록:', listResult?.length || 0, '개');
      
      if (listResult && listResult.length > 0) {
        // 파일만 필터링 (폴더 제외)
        const files = listResult.filter(item => item.type === 'file');
        console.log('📁 파일만 필터링:', files.length, '개');
        
        // 파일명이 일치하는 파일 찾기 (더 유연한 매칭)
        const targetFile = files.find(file => {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const baseFileName = fileName?.split('_').slice(0, 2).join('_'); // timestamp 부분만 추출
          
          // 여러 방법으로 매칭 시도
          return fileNameWithoutExt === fileName || 
                 file.name.includes(fileName || '') ||
                 (baseFileName && file.name.includes(baseFileName)) ||
                 ('filePath' in file && file.filePath?.includes(fileName || '')) ||
                 ('filePath' in file && baseFileName && file.filePath?.includes(baseFileName));
        });
        
        console.log('🔍 매칭 시도:', {
          찾는파일: fileName,
          기본파일명: fileName?.split('_').slice(0, 2).join('_'),
          폴더내파일들: files.map(f => f.name)
        });
        
        if (targetFile && targetFile.type === 'file') {
          console.log('🎯 찾은 파일:', {
            fileId: targetFile.fileId,
            name: targetFile.name,
            filePath: 'filePath' in targetFile ? targetFile.filePath : 'N/A',
            url: 'url' in targetFile ? targetFile.url : 'N/A'
          });
          
          deleteResult = await imagekit.deleteFile(targetFile.fileId);
        } else {
          console.log('📂 폴더 내 파일들:', files.map(f => ({ 
            name: f.name, 
            path: 'filePath' in f ? f.filePath : 'N/A' 
          })));
          
          // 정확한 매칭이 안되면 가장 최근 파일을 삭제 (프로필 이미지는 보통 하나만 있어야 함)
          if (files.length > 0) {
            // 파일명에서 타임스탬프 추출하여 가장 최근 파일 찾기
            const latestFile = files.reduce((latest, current) => {
              const latestTimestamp = latest.name.match(/image_(\d+)/)?.[1] || '0';
              const currentTimestamp = current.name.match(/image_(\d+)/)?.[1] || '0';
              return currentTimestamp > latestTimestamp ? current : latest;
            });
            
            console.log('🕒 가장 최근 파일로 삭제 시도:', latestFile.name);
            if (latestFile.type === 'file') {
              deleteResult = await imagekit.deleteFile(latestFile.fileId);
            } else {
              throw new Error('최근 파일이 실제로는 폴더입니다.');
            }
          } else {
            console.log('⚠️ 파일을 찾을 수 없음 - 이미 삭제된 것으로 간주:', fileName);
            deleteResult = { success: true, message: 'File not found - considered as already deleted' };
          }
        }
      } else {
        // 폴더가 비어있거나 파일이 없는 경우
        console.log('📁 폴더가 비어있음 - 파일이 이미 삭제된 것으로 간주');
        deleteResult = { success: true, message: 'Folder is empty - file already deleted' };
      }
    } catch (error: any) {
      console.error('❌ 모든 삭제 방법 실패:', error);
      throw error;
    }
    
    console.log('✅ ImageKit 이미지 삭제 성공:', deleteResult);
    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully',
      fileId,
      result: deleteResult
    });

  } catch (error: any) {
    console.error('❌ ImageKit 이미지 삭제 API 오류:', error);
    
    // ImageKit 에러 메시지 상세 로깅
    if (error.response) {
      console.error('ImageKit API 응답 오류:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    return NextResponse.json(
      { 
        error: 'ImageKit deletion failed', 
        details: error.message,
        errorCode: error.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}

/**
 * ImageKit URL에서 fileId 추출
 * ImageKit에서는 파일의 전체 경로가 fileId가 됨
 */
function extractFileIdFromUrl(imageUrl: string): string | null {
  try {
    console.log('🔍 URL 분석 시작:', imageUrl);
    
    // ImageKit URL 패턴 분석
    // 예: https://ik.imagekit.io/leadproject/tripjoy/profile/userId/profile_1234567890.jpg
    const url = new URL(imageUrl);
    console.log('📍 URL 경로:', url.pathname);
    
    // 경로에서 첫 번째 '/' 제거하고 분할
    const pathWithoutSlash = url.pathname.substring(1);
    const pathParts = pathWithoutSlash.split('/');
    console.log('📂 경로 부분들:', pathParts);
    
    // ImageKit에서는 일반적으로 첫 번째 부분이 프로젝트 ID이고
    // 나머지가 실제 파일 경로
    if (pathParts.length < 2) {
      console.error('❌ 경로가 너무 짧음:', pathParts);
      return null;
    }
    
    // 첫 번째 부분(프로젝트 ID) 제외하고 나머지 경로 조합
    const filePath = pathParts.slice(1).join('/');
    console.log('📁 파일 경로:', filePath);
    
    // 확장자 제거하여 fileId 생성
    const fileId = filePath.replace(/\.[^/.]+$/, '');
    console.log('🆔 최종 FileId:', fileId);
    
    return fileId;
  } catch (error) {
    console.error('❌ URL 파싱 오류:', error);
    return null;
  }
}
