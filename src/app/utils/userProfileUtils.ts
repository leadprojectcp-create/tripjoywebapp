/**
 * 사용자 프로필 관련 유틸리티 함수들
 */

export interface UserData {
  id: string;
  uid: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  birthDate?: string;
  gender?: string;
  location?: string;
  signupMethod?: 'email' | 'kakao' | 'google' | 'apple';
}

/**
 * 사용자 프로필이 완성되었는지 확인하는 함수
 * 필수 정보: name, phoneNumber, birthDate, gender
 */
export const isUserProfileComplete = (user: UserData | null): boolean => {
  console.log('🔍 프로필 완성도 체크 시작:', user);
  
  if (!user) {
    console.log('❌ 사용자 데이터가 null입니다.');
    return false;
  }

  // 필수 필드들이 모두 존재하고 비어있지 않은지 확인
  const requiredFields = ['name', 'phoneNumber', 'birthDate', 'gender'];
  
  console.log('📋 체크할 필수 필드들:', requiredFields);
  
  for (const field of requiredFields) {
    const value = user[field as keyof UserData];
    console.log(`🔍 ${field} 값:`, value, `(타입: ${typeof value})`);
    
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      console.log(`❌ 프로필 미완성: ${field}이(가) 비어있습니다.`);
      console.log('🔍 전체 사용자 데이터:', JSON.stringify(user, null, 2));
      return false;
    }
  }
  
  console.log('✅ 프로필 완성됨! 모든 필수 필드 존재');
  return true;
};

/**
 * 사용자 프로필에서 부족한 필드들을 반환하는 함수
 */
export const getMissingProfileFields = (user: UserData | null): string[] => {
  if (!user) {
    return ['name', 'phoneNumber', 'birthDate', 'gender'];
  }

  const requiredFields = ['name', 'phoneNumber', 'birthDate', 'gender'];
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const value = user[field as keyof UserData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field);
    }
  }
  
  return missingFields;
};
