// 회원가입 관련 공통 타입 정의

export interface UserInfo {
  name: string; // 이름
  countryCode: string; // 국가코드 (+82 등)
  phoneNumber: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: 'male' | 'female' | '';
  referralCode: string;
  password?: string;
  // 동의 관련 (객체로 묶음)
  consents: {
    termsOfService: boolean;
    personalInfo: boolean;
    locationInfo: boolean;
    marketing: boolean;
    thirdParty: boolean;
  };
}

export type SignupMethod = 'email' | 'kakao' | 'google' | 'apple';
