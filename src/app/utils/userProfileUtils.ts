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
  if (!user) {
    return false;
  }

  // 필수 필드들이 모두 존재하고 비어있지 않은지 확인
  const requiredFields = ['name', 'phoneNumber', 'birthDate', 'gender'];
  
  for (const field of requiredFields) {
    const value = user[field as keyof UserData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      console.log(`🔍 프로필 미완성: ${field}이(가) 비어있습니다.`);
      return false;
    }
  }
  
  console.log('✅ 프로필 완성됨');
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
