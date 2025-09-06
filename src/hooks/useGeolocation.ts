// 위치 관련 커스텀 훅

import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentPosition, 
  checkLocationPermission, 
  convertToLocationData,
  isApp,
  getPlatform
} from '../utils/geolocation';
import { LocationData, GeolocationOptions, GeolocationError } from '../types/appBridge';

interface UseGeolocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  getCurrentLocation: () => Promise<void>;
  clearLocation: () => void;
  isAppEnvironment: boolean;
  platform: 'ios' | 'android' | 'web';
}

export const useGeolocation = (
  options: GeolocationOptions = {}
): UseGeolocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const isAppEnvironment = isApp();
  const platform = getPlatform();

  // 위치 권한 확인
  const checkPermission = useCallback(async () => {
    try {
      const hasPermission = await checkLocationPermission();
      setPermissionGranted(hasPermission);
      return hasPermission;
    } catch (error) {
      console.error('❌ 위치 권한 확인 실패:', error);
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // 현재 위치 가져오기 (로딩 UI 없이 백그라운드에서 처리)
  const getCurrentLocation = useCallback(async () => {
    if (loading) return;

    // 로딩 UI를 표시하지 않음 - 백그라운드에서 조용히 처리
    setError(null);

    try {
      // 앱 환경에서는 앱에서 위치 정보를 받아오므로 웹 API 사용하지 않음
      if (isAppEnvironment) {
        console.log('📱 앱 환경: 앱에서 위치 정보를 받아옵니다.');
        return;
      }

      // 웹 환경에서는 현재 위치 기능을 사용하지 않음
      console.log('🌐 웹 환경: 현재 위치 기능을 사용하지 않습니다.');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : '위치 정보를 가져올 수 없습니다.';
      
      setError(errorMessage);
      setPermissionGranted(false);
      console.error('❌ 현재 위치 가져오기 실패:', error);
    }
  }, [loading, isAppEnvironment]);

  // 위치 정보 초기화
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setPermissionGranted(false);
  }, []);

  // 컴포넌트 마운트 시 권한 확인 (웹 환경에서만)
  useEffect(() => {
    if (!isAppEnvironment) {
      // 웹 환경에서는 권한 체크 없이 바로 true로 설정
      setPermissionGranted(true);
    }
  }, [isAppEnvironment]);

  return {
    location,
    loading,
    error,
    permissionGranted,
    getCurrentLocation,
    clearLocation,
    isAppEnvironment,
    platform
  };
};
