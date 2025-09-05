'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import styles from './GoogleMapsLocationPicker.module.css';
import { GOOGLE_MAPS_API_KEY } from '../utils/googleMaps';
import {
  Language,
  COUNTRY_MAP_CENTERS,
  getCountryRestrictions,
  getCurrentRegionCode,
  getLocationHintByLanguage
} from '../utils/locationUtils';

export interface LocationDetails {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;        // 도시 코드 (예: "HAN", "HCM", "SEL")
  nationality?: string; // 국가 코드 (예: "VN", "KR", "TH")
  cityName?: string;    // 전체 도시명 (예: "Hanoi", "Seoul")
  countryName?: string; // 전체 국가명 (예: "Vietnam", "South Korea")
}

interface GoogleMapsLocationPickerProps {
  initialLocation?: string;
  locationDetails?: LocationDetails | null;
  onLocationSelect: (location: string, locationDetails: LocationDetails | null) => void;
  className?: string;
}

const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  initialLocation = '',
  locationDetails,
  onLocationSelect,
  className = ''
}) => {
  const { t, currentLanguage } = useTranslationContext();
  const pathname = usePathname();
  
  // 게시물 업로드 페이지인지 확인
  const isPostUploadPage = pathname?.includes('/post-upload');
  
  // States
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(isPostUploadPage); // post-upload 페이지에서는 지도 표시
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  
  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 🛡️ 시크릿 모드 대응 Google Maps API 로딩
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ Google Maps API 키가 설정되지 않았습니다!');
      return;
    }

    // 시크릿 모드 감지
    const isIncognito = !window.localStorage || !window.sessionStorage;
    if (isIncognito) {
      console.log('🕵️ 시크릿 모드 감지됨 - 특별 로딩 모드');
    }

    // 전역 로딩 상태 확인 (중복 로드 방지)
    if ((window as any).__googleMapsLoading) {
      console.log('⏳ Google Maps API 이미 로딩 중...');
      return;
    }

    // 이미 로드되어 있는지 확인
    if (window.google?.maps?.places?.Autocomplete && 
        typeof window.google.maps.places.Autocomplete === 'function') {
      console.log('✅ Google Maps API 이미 로드됨');
      setTimeout(() => setIsGoogleMapsLoaded(true), 100);
      return;
    }

    // 이미 스크립트가 있는지 확인
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('⏳ Google Maps 스크립트 이미 존재, 로딩 대기...');
      // 기존 스크립트 로딩 완료 대기
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(checkInterval);
          console.log('✅ 기존 스크립트 로딩 완료');
          setIsGoogleMapsLoaded(true);
        }
      }, 100);
      
      // 시크릿 모드에서는 더 긴 타임아웃
      const timeoutDuration = isIncognito ? 10000 : 5000;
      setTimeout(() => {
        clearInterval(checkInterval);
        setIsGoogleMapsLoaded(true);
      }, timeoutDuration);
      return;
    }

    console.log('🔄 Google Maps API 로딩 시작...');
    
    // 전역 로딩 상태 설정
    (window as any).__googleMapsLoading = true;
    
    // 시크릿 모드 대응: 콜백 없이 직접 로딩
    const script = document.createElement('script');
    if (isIncognito) {
      // 시크릿 모드: 콜백 없이 직접 로딩
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.onload = () => {
        console.log('✅ Google Maps API 로드 완료 (시크릿 모드)');
        (window as any).__googleMapsLoading = false;
        setTimeout(() => setIsGoogleMapsLoaded(true), 1000);
      };
    } else {
      // 일반 모드: 콜백 사용
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
      // 전역 콜백 함수 설정
      (window as any).initGoogleMaps = () => {
        console.log('✅ Google Maps API 로드 완료');
        (window as any).__googleMapsLoading = false;
        setTimeout(() => setIsGoogleMapsLoaded(true), 500);
      };
    }
    
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('❌ Google Maps 스크립트 로드 실패');
      (window as any).__googleMapsLoading = false;
      // 실패 시에도 강제로 로드된 것으로 처리
      setTimeout(() => setIsGoogleMapsLoaded(true), 2000);
    };
    
    document.head.appendChild(script);

    // 시크릿 모드에서는 더 긴 타임아웃
    const timeoutDuration = isIncognito ? 15000 : 10000;
    const timeout = setTimeout(() => {
      console.log('⚠️ Google Maps API 로딩 타임아웃, 강제 로드');
      (window as any).__googleMapsLoading = false;
      setIsGoogleMapsLoaded(true);
    }, timeoutDuration);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  // 🚀 Autocomplete 초기화 (완전 새로 생성)
  useEffect(() => {
    if (!isGoogleMapsLoaded || !locationInputRef.current || autocomplete) {
      return;
    }

    try {
      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components', 'types'],
          componentRestrictions: getCountryRestrictions(currentLanguage as Language),
        }
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();

        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || '알 수 없는 위치';

          // 기본 정보만 추출 (수동 입력 방식이므로 API 호출 없음)
          let basicInfo: any = {};
          if (place.address_components) {
            place.address_components.forEach((component: any) => {
              const types = component.types || [];
              if (types.includes('locality')) {
                basicInfo.cityName = component.long_name;
              }
              if (types.includes('country')) {
                basicInfo.countryName = component.long_name;
                basicInfo.nationality = component.short_name || '';
              }
            });
          }

          const locationDetails: LocationDetails = {
            placeId: place.place_id || `search_${Date.now()}`,
            name: place.name || address,
            address: address,
            lat: lat,
            lng: lng,
            // 수동 입력을 위해 코드는 비워둠
            city: undefined,
            nationality: basicInfo.nationality || undefined,
            cityName: basicInfo.cityName || undefined,
            countryName: basicInfo.countryName || undefined
          };

          onLocationSelect(address, locationDetails);

          // input 값 동기화
          if (locationInputRef.current) {
            locationInputRef.current.value = address;
          }
        }
      });

      setAutocomplete(autocompleteInstance);
    } catch (error) {
      console.error('❌ Autocomplete 초기화 실패:', error);
    }

    // 🧹 Cleanup: 컴포넌트 언마운트 시 리스너 정리
    return () => {
      if (autocomplete) {
        try {
          window.google.maps.event.clearInstanceListeners(autocomplete);
        } catch (error) {
          console.log('⚠️ Autocomplete 정리 실패:', error);
        }
      }
    };
  }, [isGoogleMapsLoaded, isMapVisible, autocomplete, currentLanguage, onLocationSelect]);

  // 🗺️ Map 초기화 (완전 새로 생성)
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || !isMapVisible) {
      return;
    }

    // 기존 지도가 있으면 정리
    if (map) {
      try {
        window.google.maps.event.clearInstanceListeners(map);
        setMap(null);
      } catch (error) {
        console.log('⚠️ 기존 지도 정리 실패:', error);
      }
    }

    try {
      console.log('🗺️ 새 지도 생성 중...');
      const center = COUNTRY_MAP_CENTERS[(currentLanguage || 'ko') as Language];
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      console.log('✅ 지도 생성 완료');
      setMap(mapInstance);
    } catch (error) {
      console.error('❌ 지도 생성 실패:', error);
    }

    // 🧹 Cleanup: 컴포넌트 언마운트 시 지도 리스너 정리
    return () => {
      if (map) {
        try {
          window.google.maps.event.clearInstanceListeners(map);
        } catch (error) {
          console.log('⚠️ 지도 정리 실패:', error);
        }
      }
    };
  }, [isGoogleMapsLoaded, currentLanguage, isMapVisible]);

  // 🛡️ 지도 위치 업데이트 (안정한 의존성 배열)
  useEffect(() => {
    // 필수 조건 체크
    if (!map || !locationDetails) {
      return;
    }

    const { lat, lng, name, placeId } = locationDetails;
    
    // 좌표 유효성 체크
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return;
    }

    try {
      const position = { lat, lng };
      
      // 기존 마커 제거
      if (marker) {
        marker.setMap(null);
      }

      // 새 마커 생성
      const newMarker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: name || '선택된 위치',
        animation: window.google.maps.Animation.DROP
      });
      
      setMarker(newMarker);
      map.setCenter(position);
      map.setZoom(15);
    } catch (error) {
      console.error('❌ 마커 생성 실패:', error);
    }
  }, [
    map, 
    locationDetails?.lat, 
    locationDetails?.lng, 
    locationDetails?.placeId,
    locationDetails?.name
  ]); // 🛡️ 안정한 의존성 배열 (구체적 값들만 포함)

  // 지도 표시/숨기기 토글
  const toggleMapVisibility = () => {
    const newVisibility = !isMapVisible;
    setIsMapVisible(newVisibility);
    
    // 지도 숨길 때 완전 정리
    if (!newVisibility) {
      if (marker) {
        marker.setMap(null);
        setMarker(null);
      }
      if (map) {
        window.google.maps.event.clearInstanceListeners(map);
        setMap(null);
      }
      if (autocomplete) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
        setAutocomplete(null);
      }
    }
  };

  // 위치 제거
  const handleRemoveLocation = () => {
    onLocationSelect('', null);
    if (locationInputRef.current) {
      locationInputRef.current.value = '';
    }
    if (marker) {
      marker.setMap(null);
      setMarker(null);
    }
  };

  // 디버깅을 위한 로그
  console.log('🗺️ GoogleMapsLocationPicker 렌더링:', {
    isGoogleMapsLoaded,
    isMapVisible,
    isPostUploadPage,
    map: !!map,
    pathname
  });

  return (
    <div className={`${styles['google-maps-location-picker']} ${className}`}>
      <div className={styles['location-input-group']}>
        <label className={styles['form-label']}>
          📍 {t('location')} (선택사항)
        </label>
        
        <div className={styles['search-input-wrapper']}>
          {/* 게시물 업로드 페이지가 아닐 때만 토글 버튼 표시 */}
          {!isPostUploadPage && (
            <button
              type="button"
              className={styles['map-toggle-btn']}
              onClick={toggleMapVisibility}
            >
              {isMapVisible ? '지도 숨기기' : '지도 보기'}
            </button>
          )}
          
          {locationDetails && (
            <button
              type="button"
              className={styles['remove-location-btn']}
              onClick={handleRemoveLocation}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className={styles['search-input-wrapper']}>
          <span className={styles['search-icon']}>🔍</span>
          <input
            ref={locationInputRef}
            type="text"
            placeholder={getLocationHintByLanguage(currentLanguage as Language)}
            className={styles['location-input']}
            defaultValue={initialLocation}
          />
        </div>
      </div>

      {/* 선택된 위치 정보 */}
      {locationDetails && (
        <div className={styles['selected-location-info']}>
          <div className={styles['location-icon']}>📍</div>
          <div className={styles['location-text']}>
            <div className={styles['location-name']}>{locationDetails.name}</div>
            <div className={styles['location-address']}>{locationDetails.address}</div>
          </div>
        </div>
      )}

      {/* 지도 */}
      {isMapVisible && (
        <div className={styles['map-container']}>
          {isGoogleMapsLoaded ? (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              {!map && (
                <div className={styles['map-loading']} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}>
                  <div className={styles['loading-spinner']}></div>
                  <p>🗺️ 새 지도 생성 중...</p>
                </div>
              )}
              <div
                ref={mapRef}
                className={styles['google-map']}
                style={{ 
                  display: 'block',
                  height: '100%',
                  width: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: map ? 2 : 0
                }}
              />
            </div>
          ) : (
            <div className={styles['map-loading']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className={styles['loading-spinner']}></div>
              <p>📡 Google Maps API 로딩 중...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;