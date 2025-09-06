// 앱-웹 연동 유틸리티 함수들

import { BridgeMessage, LocationData, AppEnvironment, MessageType } from '../types/appBridge';

/**
 * 앱 환경 감지
 */
export const detectAppEnvironment = (): AppEnvironment => {
  console.log('🔍 앱 환경 감지 시작');
  console.log('🔍 window 객체 존재:', typeof window !== 'undefined');
  console.log('🔍 ReactNativeWebView 존재:', !!(window as any).ReactNativeWebView);
  console.log('🔍 navigator.userAgent:', navigator.userAgent);
  
  const isApp = typeof window !== 'undefined' && 
                (window as any).ReactNativeWebView !== undefined;
  
  let platform: 'ios' | 'android' | 'web' = 'web';
  
  if (isApp) {
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('🔍 userAgent (소문자):', userAgent);
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      platform = 'ios';
    } else {
      platform = 'android';
    }
  }

  const result = {
    isApp,
    platform,
    userAgent: navigator.userAgent
  };
  
  console.log('🔍 앱 환경 감지 결과:', result);
  return result;
};

/**
 * WebView로 메시지 전송
 */
export const sendMessageToApp = (message: BridgeMessage): void => {
  console.log('🔄 앱으로 메시지 전송 시도:', message);
  console.log('🔄 window 객체 존재:', typeof window !== 'undefined');
  console.log('🔄 ReactNativeWebView 존재:', !!(window as any).ReactNativeWebView);
  
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    try {
      const messageString = JSON.stringify(message);
      console.log('📤 전송할 메시지 문자열:', messageString);
      
      (window as any).ReactNativeWebView.postMessage(messageString);
      console.log('✅ 앱으로 메시지 전송 성공:', message);
    } catch (error) {
      console.error('❌ 앱으로 메시지 전송 실패:', error);
    }
  } else {
    console.warn('⚠️ WebView 환경이 아닙니다. 메시지 전송을 건너뜁니다.');
    console.warn('⚠️ window:', typeof window);
    console.warn('⚠️ ReactNativeWebView:', (window as any).ReactNativeWebView);
  }
};

/**
 * 앱에서 메시지 수신
 */
export const setupMessageListener = (
  callback: (message: BridgeMessage) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    try {
      const message: BridgeMessage = JSON.parse(event.data);
      console.log('📥 앱에서 메시지 수신:', message);
      callback(message);
    } catch (error) {
      console.error('❌ 메시지 파싱 실패:', error);
    }
  };

  window.addEventListener('message', handleMessage);
  
  // cleanup 함수 반환
  return () => {
    window.removeEventListener('message', handleMessage);
  };
};

/**
 * 위치 정보 요청 메시지 생성
 */
export const createLocationRequestMessage = (): BridgeMessage => {
  return {
    type: 'LOCATION_REQUEST',
    data: {},
    timestamp: Date.now()
  };
};

/**
 * 위치 정보 응답 메시지 생성
 */
export const createLocationResponseMessage = (locationData: LocationData): BridgeMessage => {
  return {
    type: 'LOCATION_RESPONSE',
    data: locationData,
    timestamp: Date.now()
  };
};

/**
 * 메시지 타입 검증
 */
export const isValidMessage = (message: any): message is BridgeMessage => {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.type === 'string' &&
    message.data !== undefined
  );
};

/**
 * 특정 타입의 메시지인지 확인
 */
export const isMessageType = (message: BridgeMessage, type: MessageType): boolean => {
  return message.type === type;
};

/**
 * 위치 업데이트 메시지인지 확인
 */
export const isLocationUpdateMessage = (message: BridgeMessage): boolean => {
  return isMessageType(message, 'LOCATION_UPDATE');
};

/**
 * 앱에서 위치 정보 요청
 */
export const requestLocationFromApp = (): void => {
  const message = createLocationRequestMessage();
  sendMessageToApp(message);
};

/**
 * 앱 환경 정보 가져오기
 */
export const getAppEnvironment = (): AppEnvironment => {
  return detectAppEnvironment();
};

/**
 * WebView 사용 가능 여부 확인
 */
export const isWebViewAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).ReactNativeWebView !== undefined;
};

/**
 * 디바이스 정보 가져오기 (앱 환경에서)
 */
export const getDeviceInfo = (): any => {
  if (!isWebViewAvailable()) {
    return null;
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
};
