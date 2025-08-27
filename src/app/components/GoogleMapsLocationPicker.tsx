'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import './GoogleMapsLocationPicker.css';
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
  
  // States
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  
  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 🛡️ 간단하고 안전한 Google Maps API 로딩
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ Google Maps API 키가 설정되지 않았습니다!');
      return;
    }

    // 이미 로드되어 있는지 확인
    if (window.google?.maps?.places?.Autocomplete && 
        typeof window.google.maps.places.Autocomplete === 'function') {

      setTimeout(() => setIsGoogleMapsLoaded(true), 300);
      return;
    }

    // 중복 스크립트 방지
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // 이미 로딩 중이면 주기적으로 체크
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          clearInterval(checkInterval);
          setIsGoogleMapsLoaded(true);
        }
      }, 500);
      
      // 30초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkInterval);
        setIsGoogleMapsLoaded(true);
      }, 30000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // API 준비 상태를 체크
      const checkReady = () => {
        if (window.google?.maps?.places?.Autocomplete && 
            typeof window.google.maps.places.Autocomplete === 'function') {
          setTimeout(() => setIsGoogleMapsLoaded(true), 1000);
        } else {
          setTimeout(checkReady, 200);
        }
      };
      
      setTimeout(checkReady, 500);
    };
    
    script.onerror = () => {
      console.error('❌ Google Maps 스크립트 로드 실패');
    };
    
    document.head.appendChild(script);
  }, []);

  // 🚀 Autocomplete 초기화 (완전 새로 생성)
  useEffect(() => {
    if (!isGoogleMapsLoaded || !isMapVisible || !locationInputRef.current || autocomplete) {
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
    if (!isGoogleMapsLoaded || !isMapVisible || !mapRef.current || map) {
      return;
    }

    try {
      const center = COUNTRY_MAP_CENTERS[(currentLanguage || 'ko') as Language];
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

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
  }, [isGoogleMapsLoaded, isMapVisible, map, currentLanguage]);

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

  return (
    <div className={`google-maps-location-picker ${className}`}>
      <div className="location-input-group">
        <label className="form-label">
          📍 {t('location')} (선택사항)
        </label>
        
        <div className="search-input-wrapper">
          <button
            type="button"
            className="map-toggle-btn"
            onClick={toggleMapVisibility}
          >
            {isMapVisible ? '지도 숨기기' : '지도 보기'}
          </button>
          
          {locationDetails && (
            <button
              type="button"
              className="remove-location-btn"
              onClick={handleRemoveLocation}
            >
              ✕
            </button>
          )}
        </div>
        
        {isMapVisible && (
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={locationInputRef}
              type="text"
              placeholder={getLocationHintByLanguage(currentLanguage as Language)}
              className="location-input"
              defaultValue={initialLocation}
            />
          </div>
        )}
      </div>

      {/* 선택된 위치 정보 */}
      {locationDetails && (
        <div className="selected-location-info">
          <div className="location-icon">📍</div>
          <div className="location-text">
            <div className="location-name">{locationDetails.name}</div>
            <div className="location-address">{locationDetails.address}</div>
          </div>
        </div>
      )}

      {/* 지도 */}
      {isMapVisible && (
        <div className="map-container">
          {isGoogleMapsLoaded ? (
            <div>
              {!map && (
                <div className="map-loading">
                  <div className="loading-spinner"></div>
                  <p>🗺️ 새 지도 생성 중...</p>
                </div>
              )}
              <div
                ref={mapRef}
                className="google-map"
                style={{ display: map ? 'block' : 'none' }}
              />
            </div>
          ) : (
            <div className="map-loading">
              <div className="loading-spinner"></div>
              <p>📡 Google Maps API 로딩 중...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;