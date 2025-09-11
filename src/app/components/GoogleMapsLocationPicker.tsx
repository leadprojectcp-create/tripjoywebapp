'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useGeolocation } from '../../hooks/useGeolocation';
import { detectAppEnvironment } from '../../utils/appBridge'; // 기존 환경 감지 함수 사용

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
  
  // 현재 위치 관련 훅들
  const { 
    location: currentLocation,
    loading,
    error,
    permissionGranted,
    getCurrentLocation
  } = useGeolocation();
  
  // States
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(isPostUploadPage); // post-upload 페이지에서는 지도 표시
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [currentLocationMarker, setCurrentLocationMarker] = useState<any>(null);
  const [isAppEnv, setIsAppEnv] = useState(false); // 앱 환경 상태
  
  // 현재 위치 관련 로컬 상태
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);


  
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

  // 🔍 앱 환경 확인 (클라이언트 사이드에서만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const environment = detectAppEnvironment();
      setIsAppEnv(environment.isApp);
      console.log('🔍 앱 환경 확인 완료:', environment);
    }
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
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // 모바일 최적화 설정
        gestureHandling: 'greedy', // 한 손으로 지도 조작 가능
        zoomControl: true, // 줌 컨트롤 표시
        scaleControl: false, // 스케일 컨트롤 숨김
        clickableIcons: false, // POI 클릭 비활성화
        // 터치 제스처 최적화
        draggable: true,
        scrollwheel: false, // 마우스 휠 비활성화 (모바일에서)
        disableDoubleClickZoom: false, // 더블클릭 줌 활성화
        // 모바일 터치 최적화
        touchZoom: true,
        panControl: false // 팬 컨트롤 숨김
      });

      // 지도 클릭 이벤트 리스너 추가
      const clickListener = mapInstance.addListener('click', async (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        console.log('📍 지도 클릭:', { lat, lng });
        
        try {
          // Geocoding API를 사용하여 주소 정보 가져오기
          const geocoder = new window.google.maps.Geocoder();
          const result = await new Promise<any>((resolve, reject) => {
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results[0]);
              } else {
                reject(new Error('주소를 찾을 수 없습니다.'));
              }
            });
          });

          const place = result;
          const address = place.formatted_address || '알 수 없는 위치';
          
          // 주소 구성 요소에서 정보 추출
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
            placeId: place.place_id || `click_${Date.now()}`,
            name: place.name || address,
            address: address,
            lat: lat,
            lng: lng,
            city: undefined,
            nationality: basicInfo.nationality || undefined,
            cityName: basicInfo.cityName || undefined,
            countryName: basicInfo.countryName || undefined
          };

          // 부모 컴포넌트에 위치 정보 전달
          onLocationSelect(address, locationDetails);

          // input 값 동기화
          if (locationInputRef.current) {
            locationInputRef.current.value = address;
          }

          console.log('✅ 클릭한 위치 정보:', locationDetails);
        } catch (error) {
          console.error('❌ 주소 정보 가져오기 실패:', error);
          alert('선택한 위치의 주소 정보를 가져올 수 없습니다.');
        }
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
  }, [isGoogleMapsLoaded, currentLanguage, isMapVisible, onLocationSelect]);


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


  // 현재 위치 버튼 클릭 핸들러 (앱에서만 사용)
  const handleCurrentLocationClick = () => {
    console.log('🎯 현재 위치 버튼 클릭됨 (앱 환경)');
    console.log('🎯 navigator.geolocation 존재:', !!navigator.geolocation);

    // 로딩 상태 표시
    setIsLoadingLocation(true);
    setLocationError(null);

    // 앱에서만 GPS 기반 정확한 위치 사용
    if (navigator.geolocation) {
      console.log('🎯 앱에서 GPS 기반 정확한 위치 가져오기 시작');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 GPS 위치 가져오기 성공:', position);
          console.log('📍 위치 좌표:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          // 지도가 있으면 현재 위치로 이동
          if (map) {
            const position = {
              lat: locationData.latitude,
              lng: locationData.longitude
            };

            // 지도 중심 이동
            map.setCenter(position);
            map.setZoom(15);

            // 기존 마커 제거
            if (currentLocationMarker) {
              currentLocationMarker.setMap(null);
            }

            // 현재 위치 마커 생성
            const marker = new window.google.maps.Marker({
              position: position,
              map: map,
              title: '현재 위치 (GPS)',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="#ffffff"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24),
                anchor: new window.google.maps.Point(12, 12)
              }
            });

            setCurrentLocationMarker(marker);
            console.log('🎯 GPS 위치 마커 생성 완료');

            // 주소 정보 가져오기
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: position }, (results: any, status: any) => {
              if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address;
                console.log('📍 GPS 위치 주소:', address);

                const locationDetails = {
                  lat: position.lat,
                  lng: position.lng,
                  address: address,
                  placeId: results[0].place_id,
                  name: '현재 위치 (GPS)'
                };

                onLocationSelect(address, locationDetails);

                // 입력 필드에 주소 표시
                if (locationInputRef.current) {
                  locationInputRef.current.value = address;
                }
              }
            });
          }

          setIsLoadingLocation(false);
          setIsPermissionGranted(true);
        },
        (error) => {
          console.error('❌ GPS 위치 실패:', error);
          setLocationError('GPS 위치를 가져올 수 없습니다. 지도를 클릭하여 위치를 선택해주세요.');
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true, // GPS 정확한 위치 사용
          timeout: 15000, // 15초 타임아웃
          maximumAge: 60000 // 1분간 캐시된 위치 사용
        }
      );
    } else {
      console.log('❌ 브라우저 Geolocation 미지원');
      setLocationError('이 기기는 위치 서비스를 지원하지 않습니다.');
      setIsLoadingLocation(false);
    }
  };

  // 수동 위치 선택 요청
  const requestManualLocationSelection = () => {
    console.log('📍 수동 위치 선택 요청');
    
    // 로딩 상태 해제
    setIsLoadingLocation(false);
    setLocationError('자동 위치 감지에 실패했습니다. 지도를 클릭하여 위치를 선택해주세요.');
    
    // 지도가 있으면 사용자에게 안내
    if (map) {
      // 지도를 한국 중심으로 이동 (사용자가 위치를 찾기 쉽게)
      const koreaCenter = { lat: 37.5665, lng: 126.9780 };
      map.setCenter(koreaCenter);
      map.setZoom(10);
      
      // 사용자에게 안내 메시지 표시
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #333;">📍 위치를 선택해주세요</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              자동 위치 감지에 실패했습니다.<br>
              지도에서 원하는 위치를 클릭해주세요.
            </p>
          </div>
        `,
        position: koreaCenter
      });
      
      infoWindow.open(map);
      
      // 5초 후 안내 메시지 자동 닫기
      setTimeout(() => {
        infoWindow.close();
      }, 5000);
    }
  };


  // 기본 위치(서울) 사용
  const useDefaultLocation = () => {
    console.log('🏠 기본 위치(서울) 사용');
    const defaultLocation = {
      latitude: 37.5665,
      longitude: 126.9780,
      accuracy: 1000
    };
    
    // 지도가 있으면 기본 위치로 이동
    if (map) {
      const position = { 
        lat: defaultLocation.latitude, 
        lng: defaultLocation.longitude 
      };
      
      // 지도 중심 이동
      map.setCenter(position);
      map.setZoom(15);
      
      // 기존 마커 제거
      if (currentLocationMarker) {
        currentLocationMarker.setMap(null);
      }
      
      // 기본 위치 마커 생성
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: '기본 위치 (서울)',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#FF6B6B" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 12)
        }
      });
      
      setCurrentLocationMarker(marker);
      console.log('🎯 기본 위치 마커 생성 완료');
      
      // 주소 정보 가져오기
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: position }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const address = results[0].formatted_address;
          console.log('📍 기본 위치 주소:', address);
          
          const locationDetails = {
            lat: position.lat,
            lng: position.lng,
            address: address,
            placeId: results[0].place_id,
            name: '기본 위치 (서울)'
          };
          
          onLocationSelect(address, locationDetails);
          
          // 입력 필드에 주소 표시
          if (locationInputRef.current) {
            locationInputRef.current.value = address;
          }
        }
      });
    }
    
    setIsLoadingLocation(false);
    setIsPermissionGranted(true);
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
          
                  {/* 현재 위치 버튼 (앱에서만 표시) */}
                  {isAppEnv && (
                    <button
                      type="button"
                      className={styles['current-location-btn']}
                      onClick={handleCurrentLocationClick}
                      title={isPermissionGranted ? "현재 위치로 이동" : "위치 권한 허용 후 현재 위치로 이동"}
                      disabled={isLoadingLocation}
                    >
                      {isLoadingLocation ? '⏳' : isPermissionGranted ? '📍' : '📍❓'}
                    </button>
                  )}
          
          {/* 위치 권한 에러 메시지 */}
          {locationError && (
            <div className={styles['location-error']}>
              <small style={{ color: '#e74c3c' }}>
                {locationError.includes('denied') ? '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.' : locationError}
              </small>
            </div>
          )}
          
        </div>
        
        <div className={styles['search-input-wrapper']}>
          <img src="/icons/search.svg" alt="검색" width="16" height="16" className={styles['search-icon']} />
          <input
            ref={locationInputRef}
            type="text"
            placeholder={getLocationHintByLanguage(currentLanguage as Language)}
            className={styles['location-input']}
            defaultValue={initialLocation}
          />
        </div>
      </div>

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

      {/* 선택된 위치 정보 - 지도 밑에 표시 */}
      {locationDetails && (
        <>
          <div className={styles['location-name-group']}>
            <label className={styles['location-name-label']}>가게명</label>
            <input
              type="text"
              value={locationDetails.name}
              onChange={(e) => {
                const updatedLocationDetails = {
                  ...locationDetails,
                  name: e.target.value
                };
                onLocationSelect(locationDetails.address, updatedLocationDetails);
              }}
              className={styles['location-name-input']}
            />
          </div>
          <div className={styles['location-address-group']}>
            <div className={styles['location-address-content']}>
              <div className={styles['location-address-icon']}>
                <img src="/icons/location_on.svg" alt="위치" width="16" height="16" />
              </div>
              <span className={styles['location-address-text']}>{locationDetails.address}</span>
            </div>
            <button
              type="button"
              className={styles['remove-location-btn']}
              onClick={handleRemoveLocation}
            >
              <img src="/icons/close_md.svg" alt="닫기" width="16" height="16" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(GoogleMapsLocationPicker);