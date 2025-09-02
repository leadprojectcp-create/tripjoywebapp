import { NextRequest, NextResponse } from 'next/server';

// Firebase Auth REST API를 사용하여 카카오 사용자 인증
async function authenticateWithFirebase(kakaoUid: string, email: string, profileNickname: string, profileImage?: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!projectId || !apiKey) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }
  
  try {
    console.log(`🔄 Firebase 사용자 인증 시작: ${kakaoUid}, ${email}`);
    
    // 1. 새 사용자 생성 시도
    const signUpEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp`;
    const tempPassword = `kakao_${kakaoUid}_temp_password`;
    
    console.log('📝 새 사용자 생성 시도...');
    const signUpResponse = await fetch(`${signUpEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: tempPassword,
        displayName: profileNickname,
        photoUrl: profileImage || '',
        returnSecureToken: true,
      }),
    });

    const signUpData = await signUpResponse.json();
    console.log('📝 signUp 응답:', signUpData);

    if (signUpResponse.ok) {
      console.log(`✅ 새 사용자 생성 완료: ${kakaoUid}`);
      return { success: true, userData: signUpData, isNewUser: true };
    }

    // 2. 사용자가 이미 존재하는 경우 (EMAIL_EXISTS 에러)
    if (signUpData.error?.message?.includes('EMAIL_EXISTS')) {
      console.log('📝 기존 사용자 발견, 로그인 시도...');
      
      const signInEndpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signInWithPassword`;
      
      const signInResponse = await fetch(`${signInEndpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: tempPassword,
          returnSecureToken: true,
        }),
      });

      const signInData = await signInResponse.json();
      console.log('📝 signIn 응답:', signInData);

      if (signInResponse.ok) {
        console.log(`✅ 기존 사용자 로그인 성공: ${kakaoUid}`);
        return { success: true, userData: signInData, isNewUser: false };
      } else {
        // 로그인 실패 (비밀번호가 다를 수 있음)
        console.error('❌ 기존 사용자 로그인 실패:', signInData);
        throw new Error(`기존 사용자 로그인 실패: ${signInData.error?.message || '알 수 없는 오류'}`);
      }
    }

    // 3. 기타 signUp 에러
    console.error('❌ 사용자 생성 실패:', signUpData);
    throw new Error(`사용자 생성 실패: ${signUpData.error?.message || '알 수 없는 오류'}`);
    
  } catch (error) {
    console.error('❌ Firebase 사용자 인증 오류:', error);
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
    
    // Firebase 사용자 인증
    const authResult = await authenticateWithFirebase(
      kakaoUid, 
      email, 
      profileNickname, 
      profileImage
    );
    
    console.log('✅ Firebase 사용자 인증 처리 완료');
    
    return NextResponse.json({ 
      success: true,
      status: 'success',
      isNewUser: authResult.isNewUser,
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
