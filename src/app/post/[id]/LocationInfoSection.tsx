'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PostData } from '../../services/postService';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { GOOGLE_MAPS_API_KEY } from '../../utils/googleMaps';
import { NavigationPopup } from './NavigationPopup';
import { TaxiPopup } from './TaxiPopup';
import styles from './page.module.css';

// Google Maps 타입 선언
declare global {
  interface Window {
    google: any;
  }
}

interface LocationInfoSectionProps {
  post: PostData;
  translatedBusinessHours: string | null;
  translatedRecommendedMenu: string | null;
  translatedAddress: string | null;
  translatePaymentMethod: (method: string) => string;
  translatePostLocation: (location: any) => string;
}

export const LocationInfoSection: React.FC<LocationInfoSectionProps> = ({
  post,
  translatedBusinessHours,
  translatedRecommendedMenu,
  translatedAddress,
  translatePaymentMethod,
  translatePostLocation
}) => {
  const { t } = useTranslationContext();
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [showNavigationPopup, setShowNavigationPopup] = useState(false);
  const [showTaxiPopup, setShowTaxiPopup] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Google Maps 초기화
  useEffect(() => {
    if (!post?.location?.coordinates) return;

    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      const { lat, lng } = post.location!.coordinates;
      
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });
      
      // 마커 추가
      new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: post.location!.name,
      });
      
      setIsGoogleMapsLoaded(true);
    };

    // Google Maps API가 이미 로드되어 있는지 확인
    if (window.google && window.google.maps) {
      setTimeout(initMap, 100);
    } else {
      // 이미 Google Maps 스크립트가 로드 중인지 확인
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // 이미 로드 중이면 onload 이벤트 리스너 추가
        existingScript.addEventListener('load', () => {
          setTimeout(initMap, 100);
        });
      } else {
        // 스크립트가 없으면 새로 생성
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ko`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setTimeout(initMap, 100);
        };
        document.head.appendChild(script);
      }
    }
  }, [post?.location?.coordinates, post.location?.name]);

  return (
    <div className={styles.detailInfoSection}>
      {/* 위치 이름 (아이콘과 함께) */}
      {post?.location?.name && (
        <div className={styles.locationHeader}>
          <img 
            src="/icons/location_on_detail.svg" 
            alt="위치" 
            className={styles.locationIcon}
          />
          <span className={styles.locationName}>{post.location.name}</span>
        </div>
      )}

      {/* 영업시간 */}
      {post.businessHours && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('businessHours')}</span>
          <span className={styles.infoValue}>
            {translatedBusinessHours || post.businessHours}
          </span>
        </div>
      )}

      {/* 결제 방법 */}
      {post.paymentMethod && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('paymentMethod')}</span>
          <span className={styles.infoValue}>{translatePaymentMethod(post.paymentMethod)}</span>
        </div>
      )}

      {/* 추천 메뉴 */}
      {post.recommendedMenu && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('recommendedMenu')}</span>
          <span className={styles.infoValue}>
            {translatedRecommendedMenu || post.recommendedMenu}
          </span>
        </div>
      )}

      {/* 위치 정보 */}
      {post?.location && translatePostLocation(post.location) && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('location')}</span>
          <span className={styles.infoValue}>
            {translatePostLocation(post.location)}
          </span>
        </div>
      )}

      {/* 상세 주소 */}
      {post.location && post.location.address && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>{t('address')}</span>
          <span className={styles.infoValue}>
            <div className={styles.locationAddress}>
              {translatedAddress || post.location.address}
            </div>
          </span>
        </div>
      )}

      {/* 지도 */}
      {post.location && (
        <div className={styles.mapRow}>
          <div className={styles.mapContainer}>
            {!isGoogleMapsLoaded && (
              <div className={styles.mapLoading}>
                <div className={styles.loadingSpinner}></div>
                <p>지도를 불러오는 중...</p>
              </div>
            )}
            <div
              ref={mapRef}
              className={styles.googleMap}
              style={{
                height: '150px',
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                display: isGoogleMapsLoaded ? 'block' : 'none'
              }}
            />
          </div>
          
          {/* 길찾기/택시 호출 버튼 */}
          <div className={styles.actionButtons}>
            <button 
              className={styles.directionsBtn}
              onClick={() => setShowNavigationPopup(true)}
            >
              {t('directions')}
            </button>
            <button 
              className={styles.taxiBtn}
              onClick={() => setShowTaxiPopup(true)}
            >
              {t('callTaxi')}
            </button>
          </div>
          
          {/* 안내 텍스트 */}
          <div className={styles.disclaimerSection}>
            <div className={styles.disclaimerText}>
              • {t('disclaimer1')}
            </div>
            <div className={styles.disclaimerText}>
              • {t('disclaimer2')}
            </div>
            <div className={styles.disclaimerText}>
              • {t('disclaimer3')}
            </div>
          </div>
        </div>
      )}
      
      {/* 팝업들 */}
      <NavigationPopup
        isOpen={showNavigationPopup}
        onClose={() => setShowNavigationPopup(false)}
        destination={{
          lat: post?.location?.coordinates?.lat || 0,
          lng: post?.location?.coordinates?.lng || 0,
          name: post?.location?.name,
          address: post?.location?.address
        }}
      />
      
      <TaxiPopup
        isOpen={showTaxiPopup}
        onClose={() => setShowTaxiPopup(false)}
        destination={{
          lat: post?.location?.coordinates?.lat || 0,
          lng: post?.location?.coordinates?.lng || 0,
          name: post?.location?.name
        }}
      />
    </div>
  );
};
