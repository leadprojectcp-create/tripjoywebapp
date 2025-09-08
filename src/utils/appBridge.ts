// 앱-웹 연동 유틸리티 함수들

import { BridgeMessage, LocationData, AppEnvironment, MessageType } from '../types/appBridge';

/**
 * 앱 환경 감지
 */
export const detectAppEnvironment = (): AppEnvironment => {
  // 서버 사이드 렌더링에서는 기본값 반환
  if (typeof window === 'undefined') {
    console.log('🔍 서버 사이드 렌더링 - 기본값 반환');
    return {
      isApp: false,
      platform: 'web' as const,
      userAgent: ''
    };
  }

  console.log('🔍 앱 환경 감지 시작');
  console.log('🔍 window 객체 존재:', typeof window !== 'undefined');
  console.log('🔍 ReactNativeWebView 존재:', !!(window as any).ReactNativeWebView);
  console.log('🔍 navigator.userAgent:', navigator.userAgent);
  console.log('🔍 window.location.href:', window.location.href);
  
  // 더 확실한 앱 환경 감지
  const urlParams = new URLSearchParams(window.location.search);
  const isAppFromUrl = urlParams.get('app') === 'true';
  const platformFromUrl = urlParams.get('platform') as 'ios' | 'android' | null;
  console.log('🔍 URL 파라미터 app:', urlParams.get('app'));
  console.log('🔍 URL 파라미터 platform:', platformFromUrl);
  
  const isApp = isAppFromUrl ||
                (window as any).ReactNativeWebView !== undefined || 
                navigator.userAgent.includes('wv') ||
                navigator.userAgent.includes('WebView') ||
                navigator.userAgent.includes('TripJoy');
  
  let platform: 'ios' | 'android' | 'web' = 'web';
  
  if (isApp) {
    // URL 파라미터에서 플랫폼 정보를 우선 사용
    if (platformFromUrl && (platformFromUrl === 'ios' || platformFromUrl === 'android')) {
      platform = platformFromUrl;
    } else {
      // URL 파라미터가 없으면 userAgent로 감지
      const userAgent = navigator.userAgent.toLowerCase();
      console.log('🔍 userAgent (소문자):', userAgent);
      
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        platform = 'ios';
      } else {
        platform = 'android';
      }
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
  
  // 여러 방법으로 메시지 전송 시도
  if (typeof window !== 'undefined') {
    try {
      const messageString = JSON.stringify(message);
      console.log('📤 전송할 메시지 문자열:', messageString);
      
      // 방법 1: ReactNativeWebView.postMessage
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(messageString);
        console.log('✅ ReactNativeWebView.postMessage로 전송 성공');
      }
      
      // 방법 2: window.postMessage
      if (window.postMessage) {
        window.postMessage(messageString, '*');
        console.log('✅ window.postMessage로 전송 성공');
      }
      
      // 방법 3: 직접 호출
      if ((window as any).sendMessageToApp) {
        (window as any).sendMessageToApp(message);
        console.log('✅ sendMessageToApp 함수로 전송 성공');
      }
      
      console.log('✅ 앱으로 메시지 전송 완료:', message);
    } catch (error) {
      console.error('❌ 앱으로 메시지 전송 실패:', error);
    }
  } else {
    console.warn('⚠️ window 객체가 없습니다.');
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
      console.log('📥 웹앱에서 메시지 이벤트 수신:', event.data);
      
      if (!event.data) {
        console.log('📥 빈 메시지 무시');
        return;
      }

      let message;
      if (typeof event.data === 'string') {
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.warn('⚠️ JSON 파싱 실패:', error);
          return;
        }
      } else {
        message = event.data;
      }
      
      console.log('📥 앱에서 메시지 수신 성공:', message);
      callback(message);
    } catch (error) {
      console.error('❌ 메시지 처리 실패:', error);
    }
  };

  // 여러 이벤트 리스너 등록
  window.addEventListener('message', handleMessage);
  
  // ReactNativeWebView 메시지 리스너도 추가
  if ((window as any).ReactNativeWebView) {
    console.log('📥 ReactNativeWebView 메시지 리스너 등록');
    (window as any).ReactNativeWebView.onMessage = (data: string) => {
      try {
        console.log('📥 ReactNativeWebView.onMessage 수신:', data);
        
        if (!data) {
          console.log('📥 ReactNativeWebView: 빈 데이터 무시');
          return;
        }

        const message = JSON.parse(data);
        console.log('📥 ReactNativeWebView 메시지 수신 성공:', message);
        callback(message);
      } catch (error) {
        console.error('❌ ReactNativeWebView 메시지 처리 실패:', error);
      }
    };
  }
  
  // cleanup 함수 반환
  return () => {
    window.removeEventListener('message', handleMessage);
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.onMessage = null;
    }
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
