// 위치 관련 유틸리티 함수들

import { GeolocationOptions, GeolocationError } from '../types/appBridge';

/**
 * 환경 감지 함수들
 */
export const isWebView = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).ReactNativeWebView !== undefined;
};

export const isApp = (): boolean => {
  return isWebView() || 
         (typeof navigator !== 'undefined' && 
          navigator.userAgent.includes('wv'));
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (!isApp()) return 'web';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  }
  return 'android';
};

/**
 * 위치 권한 확인
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  if (!navigator.geolocation) {
    return false;
  }

  try {
    // 권한 상태 확인 (일부 브라우저에서만 지원)
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return permission.state === 'granted';
    }
    return true; // 권한 API가 없으면 true로 가정
  } catch (error) {
    console.warn('위치 권한 확인 실패:', error);
    return true; // 에러 시 true로 가정
  }
};

/**
 * 현재 위치 가져오기 (웹 환경)
 */
export const getCurrentPosition = (
  options: GeolocationOptions = {}
): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 현재 위치 가져오기 성공:', position.coords);
        resolve(position);
      },
      (error) => {
        console.error('❌ 현재 위치 가져오기 실패:', error);
        const geolocationError: GeolocationError = {
          code: error.code,
          message: getGeolocationErrorMessage(error.code)
        };
        reject(geolocationError);
      },
      defaultOptions
    );
  });
};

/**
 * 위치 에러 메시지 변환
 */
export const getGeolocationErrorMessage = (code: number): string => {
  switch (code) {
    case 1:
      return '위치 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
    case 2:
      return '위치 정보를 가져올 수 없습니다. 네트워크 연결을 확인해주세요.';
    case 3:
      return '위치 요청 시간이 초과되었습니다. 다시 시도해주세요.';
    default:
      return '알 수 없는 위치 오류가 발생했습니다.';
  }
};

/**
 * 위치 정보를 LocationData 형식으로 변환
 */
export const convertToLocationData = (position: GeolocationPosition) => {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    heading: position.coords.heading,
    speed: position.coords.speed
  };
};

/**
 * 두 위치 간의 거리 계산 (미터 단위)
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터 단위
};
