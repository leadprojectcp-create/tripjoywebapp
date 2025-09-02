import { NextRequest, NextResponse } from 'next/server';

// Firebase Auth REST API를 사용하여 사용자 생성/업데이트 및 Custom Token 생성
async function createOrUpdateUserAndToken(kakaoUid: string, email: string, profileNickname: string, profileImage?: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  try {
    console.log(`🔄 Firebase 사용자 처리 시작: ${kakaoUid}`);
    
    // 1. 먼저 기존 사용자 확인 (signInWithPassword로 시도)
    const signInEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signInWithPassword`;
    const tempPassword = `kakao_${kakaoUid}_temp_password`;
    
    try {
      const signInResponse = await fetch(`${signInEndpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: tempPassword,
          returnSecureToken: true,
        }),
      });

      if (signInResponse.ok) {
        console.log(`✅ 기존 사용자 로그인 성공: ${kakaoUid}`);
        const userData = await signInResponse.json();
        
        // 2. 사용자 정보 업데이트
        const updateEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
        const updateResponse = await fetch(`${updateEndpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: userData.idToken,
            displayName: profileNickname,
            photoUrl: profileImage,
            returnSecureToken: true,
          }),
        });

        if (updateResponse.ok) {
          console.log(`✅ 사용자 정보 업데이트 완료: ${kakaoUid}`);
          return { success: true, userData: await updateResponse.json() };
        }
      }
    } catch (signInError) {
      console.log(`📝 기존 사용자 없음, 새로 생성: ${kakaoUid}`);
    }

    // 3. 새 사용자 생성
    const signUpEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp`;
    const signUpResponse = await fetch(`${signUpEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: tempPassword,
        displayName: profileNickname,
        photoUrl: profileImage,
        returnSecureToken: true,
      }),
    });

    if (signUpResponse.ok) {
      console.log(`✅ 새 사용자 생성 완료: ${kakaoUid}`);
      const userData = await signUpResponse.json();
      return { success: true, userData };
    }

    throw new Error('Firebase 사용자 생성/업데이트 실패');
    
  } catch (error) {
    console.error('Firebase 사용자 처리 오류:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    console.log('📥 수신된 요청 데이터:', requestData);
    
    // 파이썬 코드와 정확히 동일한 필드명 사용
    const kakaoUid = requestData.kakao_uid;
    const email = requestData.firebase_identifier;
    const profileNickname = requestData.profile_nickname;
    const profileImage = requestData.profile_image;
    
    console.log('🔍 추출된 데이터:', { 
      kakao_uid: kakaoUid, 
      firebase_identifier: email, 
      profile_nickname: profileNickname, 
      profile_image: profileImage 
    });
    
    // 필수 필드 검증
    if (!kakaoUid) {
      console.error('❌ kakao_uid 누락:', requestData);
      return NextResponse.json(
        { 
          error: 'kakao_uid가 필요합니다.',
          required: ['kakao_uid', 'firebase_identifier', 'profile_nickname']
        },
        { status: 400 }
      );
    }
    
    if (!email) {
      console.error('❌ firebase_identifier 누락:', requestData);
      return NextResponse.json(
        { 
          error: 'firebase_identifier가 필요합니다.',
          required: ['kakao_uid', 'firebase_identifier', 'profile_nickname']
        },
        { status: 400 }
      );
    }
    
    if (!profileNickname) {
      console.error('❌ profile_nickname 누락:', requestData);
      return NextResponse.json(
        { 
          error: 'profile_nickname이 필요합니다.',
          required: ['kakao_uid', 'firebase_identifier', 'profile_nickname']
        },
        { status: 400 }
      );
    }
    
    console.log('🔄 카카오 사용자 Firebase 인증 처리 시작:', { kakao_uid: kakaoUid, firebase_identifier: email, profile_nickname: profileNickname });
    
    // Firebase 사용자 생성/업데이트 및 인증
    const authResult = await createOrUpdateUserAndToken(
      kakaoUid, 
      email, 
      profileNickname, 
      profileImage
    );
    
    console.log('✅ Firebase 사용자 인증 처리 완료');
    
    return NextResponse.json({ 
      success: true,
      status: 'success',
      user: {
        uid: authResult.userData.localId,
        email: authResult.userData.email,
        name: authResult.userData.displayName,
        picture: authResult.userData.photoUrl,
        provider: 'kakao'
      },
      firebaseData: authResult.userData
    });
    
  } catch (error: any) {
    console.error('❌ Firebase 사용자 인증 실패:', error);
    return NextResponse.json(
      { 
        error: `Firebase 사용자 인증에 실패했습니다: ${error.message}`,
        status: 'error'
      },
      { status: 500 }
    );
  }
}
