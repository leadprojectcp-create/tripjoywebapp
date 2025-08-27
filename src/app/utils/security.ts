// 보안 관련 유틸리티

// 이메일 형식 검증
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 비밀번호 강도 검증
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return { isValid: false, message: '비밀번호는 6자 이상이어야 합니다.' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: '비밀번호는 128자 이하여야 합니다.' };
  }

  // 특수문자, 숫자, 대소문자 포함 권장 (선택사항)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);

  if (!hasSpecialChar || !hasNumber || !hasUpperCase || !hasLowerCase) {
    return { 
      isValid: true, 
      message: '보안을 위해 특수문자, 숫자, 대소문자를 포함하는 것을 권장합니다.' 
    };
  }

  return { isValid: true, message: '안전한 비밀번호입니다.' };
};

// 휴대폰 번호 형식 검증
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // 한국 휴대폰 번호 형식 (010-1234-5678 또는 01012345678)
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
};

// 생년월일 검증
export const validateBirthDate = (year: string, month: string, day: string): boolean => {
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);

  if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  if (yearNum < 1900 || yearNum > currentYear) {
    return false;
  }

  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
    return false;
  }

  return true;
};

// XSS 방지를 위한 입력 데이터 정제
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
};

// 민감한 정보 마스킹
export const maskSensitiveData = (data: string, type: 'email' | 'phone' | 'name'): string => {
  switch (type) {
    case 'email':
      const [localPart, domain] = data.split('@');
      if (localPart.length <= 2) return data;
      return `${localPart.substring(0, 2)}***@${domain}`;
    
    case 'phone':
      if (data.length <= 4) return data;
      return `${data.substring(0, 3)}-****-${data.substring(data.length - 4)}`;
    
    case 'name':
      if (data.length <= 1) return data;
      return `${data.substring(0, 1)}***`;
    
    default:
      return data;
  }
};

// CSRF 토큰 생성 (간단한 구현)
export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// 입력 길이 제한
export const validateInputLength = (input: string, maxLength: number): boolean => {
  return input.length <= maxLength;
};

// 파일 업로드 검증 (향후 확장용)
export const validateFileUpload = (file: File, maxSize: number = 5 * 1024 * 1024): { isValid: boolean; message: string } => {
  if (file.size > maxSize) {
    return { isValid: false, message: `파일 크기는 ${maxSize / 1024 / 1024}MB 이하여야 합니다.` };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, message: '지원하지 않는 파일 형식입니다.' };
  }

  return { isValid: true, message: '파일이 유효합니다.' };
};
