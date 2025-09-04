import { AuthErrorCodes } from 'firebase/auth';
import { FirestoreError } from 'firebase/firestore';
import { isDevelopment } from './env';

// Firebase v12에서 AuthError 타입 정의
interface AuthError {
  code: string;
  message: string;
  stack?: string;
}

// Firebase Auth 에러 메시지 변환
export const getAuthErrorMessage = (error: { code: string; message?: string }): string => {
  if (isDevelopment) {
    console.error('Firebase Auth Error:', error);
  }

  switch (error.code) {
    case AuthErrorCodes.INVALID_EMAIL:
      return '유효하지 않은 이메일 주소입니다.';
    case AuthErrorCodes.USER_DELETED:
      return '존재하지 않는 사용자입니다.';
    case AuthErrorCodes.USER_DISABLED:
      return '비활성화된 계정입니다.';
    case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
      return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
    case AuthErrorCodes.OPERATION_NOT_ALLOWED:
      return '이 작업은 허용되지 않습니다.';
    case AuthErrorCodes.EMAIL_EXISTS:
      return '이미 사용 중인 이메일 주소입니다.';
    case AuthErrorCodes.WEAK_PASSWORD:
      return '비밀번호가 너무 약합니다. 6자 이상으로 설정해주세요.';
    case AuthErrorCodes.INVALID_PASSWORD:
      return '잘못된 비밀번호입니다.';
    case AuthErrorCodes.INVALID_CREDENTIAL:
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case AuthErrorCodes.INVALID_APP_CREDENTIAL:
      return '잘못된 로그인 정보입니다.';
    case AuthErrorCodes.POPUP_CLOSED_BY_USER:
      return '로그인 창이 닫혔습니다. 다시 시도해주세요.';
    case AuthErrorCodes.POPUP_BLOCKED:
      return '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.';
    case AuthErrorCodes.NETWORK_REQUEST_FAILED:
      return '네트워크 연결을 확인해주세요.';
    case AuthErrorCodes.INVALID_API_KEY:
      return 'Firebase 설정에 문제가 있습니다. 관리자에게 문의해주세요.';
    case AuthErrorCodes.APP_NOT_AUTHORIZED:
      return '앱이 Firebase 프로젝트에 인증되지 않았습니다.';
    default:
      return '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
  }
};

// Firestore 에러 메시지 변환
export const getFirestoreErrorMessage = (error: FirestoreError): string => {
  if (isDevelopment) {
    console.error('Firestore Error:', error);
  }

  switch (error.code) {
    case 'permission-denied':
      return '데이터베이스 접근 권한이 없습니다.';
    case 'unavailable':
      return '데이터베이스 서비스를 사용할 수 없습니다.';
    case 'not-found':
      return '요청한 데이터를 찾을 수 없습니다.';
    case 'already-exists':
      return '이미 존재하는 데이터입니다.';
    case 'resource-exhausted':
      return '데이터베이스 리소스가 부족합니다.';
    case 'failed-precondition':
      return '작업을 수행할 수 없는 상태입니다.';
    case 'aborted':
      return '작업이 중단되었습니다.';
    case 'out-of-range':
      return '요청이 범위를 벗어났습니다.';
    case 'unimplemented':
      return '지원하지 않는 작업입니다.';
    case 'internal':
      return '내부 서버 오류가 발생했습니다.';
    case 'data-loss':
      return '데이터 손실이 발생했습니다.';
    case 'unauthenticated':
      return '인증이 필요합니다.';
    default:
      return '데이터베이스 오류가 발생했습니다.';
  }
};

// 일반 에러 메시지 변환
export const getErrorMessage = (error: unknown): string => {
  // Firebase Auth 에러 체크
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('auth/')) {
    return getAuthErrorMessage(error as { code: string; message?: string });
  }
  
  // Firestore 에러 체크
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('firestore/')) {
    return getFirestoreErrorMessage(error as FirestoreError);
  }
  
  if (error instanceof Error) {
    if (isDevelopment) {
      console.error('General Error:', error);
    }
    return error.message || '알 수 없는 오류가 발생했습니다.';
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

// 에러 로깅 (프로덕션에서는 민감한 정보 제외)
export const logError = (error: unknown, context?: string) => {
  if (isDevelopment) {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  } else {
    // 프로덕션에서는 에러 추적 서비스로 전송
    console.error(`Error${context ? ` in ${context}` : ''}:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};
