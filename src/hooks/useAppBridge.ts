// 앱-웹 연동 커스텀 훅

import { useState, useEffect, useCallback } from 'react';
import { 
  setupMessageListener, 
  sendMessageToApp, 
  requestLocationFromApp,
  getAppEnvironment,
  isValidMessage,
  isLocationUpdateMessage
} from '../utils/appBridge';
import { BridgeMessage, LocationData, AppEnvironment } from '../types/appBridge';

interface UseAppBridgeReturn {
  appEnvironment: AppEnvironment;
  isWebViewAvailable: boolean;
  locationFromApp: LocationData | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  sendMessage: (message: BridgeMessage) => void;
  clearLocation: () => void;
}

export const useAppBridge = (): UseAppBridgeReturn => {
  const [appEnvironment, setAppEnvironment] = useState<AppEnvironment>({
    isApp: false,
    platform: 'web'
  });
  const [locationFromApp, setLocationFromApp] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebViewAvailable, setIsWebViewAvailable] = useState(false);

  // 앱 환경 감지
  useEffect(() => {
    const environment = getAppEnvironment();
    setAppEnvironment(environment);
    setIsWebViewAvailable(environment.isApp);
    
    console.log('🔍 앱 환경 감지:', environment);
  }, []);

  // 앱에서 메시지 수신 처리
  useEffect(() => {
    if (!appEnvironment.isApp) {
      return;
    }

    const cleanup = setupMessageListener((message: BridgeMessage) => {
      try {
        if (!isValidMessage(message)) {
          console.warn('⚠️ 유효하지 않은 메시지:', message);
          return;
        }

        console.log('📥 앱에서 메시지 수신:', message);

        // 위치 업데이트 메시지 처리
        if (isLocationUpdateMessage(message)) {
          const locationData = message.data as LocationData;
          setLocationFromApp(locationData);
          setLoading(false);
          setError(null);
          console.log('📍 앱에서 위치 정보 수신:', locationData);
        }

        // 다른 메시지 타입들도 여기서 처리 가능
        // switch (message.type) {
        //   case 'CAMERA_RESPONSE':
        //     // 카메라 응답 처리
        //     break;
        //   case 'FILE_RESPONSE':
        //     // 파일 응답 처리
        //     break;
        // }

      } catch (error) {
        console.error('❌ 메시지 처리 실패:', error);
        setError('메시지 처리 중 오류가 발생했습니다.');
        setLoading(false);
      }
    });

    return cleanup;
  }, [appEnvironment.isApp]);

  // 앱에 위치 정보 요청
  const requestLocation = useCallback(() => {
    if (!appEnvironment.isApp) {
      setError('앱 환경에서만 사용할 수 있습니다.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      requestLocationFromApp();
      console.log('📤 앱에 위치 정보 요청');
    } catch (error) {
      console.error('❌ 위치 정보 요청 실패:', error);
      setError('위치 정보 요청에 실패했습니다.');
      setLoading(false);
    }
  }, [appEnvironment.isApp]);

  // 앱에 메시지 전송
  const sendMessage = useCallback((message: BridgeMessage) => {
    if (!appEnvironment.isApp) {
      console.warn('⚠️ 앱 환경이 아닙니다. 메시지 전송을 건너뜁니다.');
      return;
    }

    try {
      sendMessageToApp(message);
      console.log('📤 앱에 메시지 전송:', message);
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
      setError('메시지 전송에 실패했습니다.');
    }
  }, [appEnvironment.isApp]);

  // 위치 정보 초기화
  const clearLocation = useCallback(() => {
    setLocationFromApp(null);
    setError(null);
  }, []);

  return {
    appEnvironment,
    isWebViewAvailable,
    locationFromApp,
    loading,
    error,
    requestLocation,
    sendMessage,
    clearLocation
  };
};
