'use client';

import { useState } from 'react';
import { getAppEnvironment, requestLocationFromApp, requestOpenDeepLink, isMessageType } from '../../../utils/appBridge';
import { generateDeepLinks } from '../../utils/deepLinks';
import { useTranslationContext } from '../../contexts/TranslationContext';
import styles from './NavigationPopup.module.css';

interface NavigationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
}

export const NavigationPopup = ({ isOpen, onClose, destination }: NavigationPopupProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslationContext();
  const appEnvironment = getAppEnvironment();
  const isApp = appEnvironment.isApp;

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!isApp) {
        reject(new Error('App environment required'));
        return;
      }

      console.log('📍 위치 정보 요청 시작');
      console.log('📍 ReactNativeWebView 존재 여부:', !!(window as any).ReactNativeWebView);
      console.log('📍 requestLocationFromApp 함수 호출');
      requestLocationFromApp();
      console.log('📍 requestLocationFromApp 함수 호출 완료');

      const handleRNWebViewMessage = (data: string | object) => {
        try {
          console.log('📍 RN WebView 메시지 수신:', data);
          console.log('📍 메시지 타입:', typeof data);
          console.log('📍 메시지 내용:', JSON.stringify(data));
          
          // data가 이미 객체인지 문자열인지 확인
          let message;
          if (typeof data === 'string') {
            console.log('📍 문자열 메시지 파싱 시도:', data);
            try {
              message = JSON.parse(data);
            } catch (parseError) {
              console.error('📍 JSON 파싱 실패:', parseError);
              return;
            }
          } else {
            console.log('📍 객체 메시지 직접 사용:', data);
            message = data;
          }
          
          console.log('📍 파싱된 메시지:', message);
          console.log('📍 메시지 타입 확인:', message.type);
          
          if (message.type === 'LOCATION_RESPONSE') {
            console.log('📍 LOCATION_RESPONSE 메시지 확인됨');
            if (message.data) {
              console.log('📍 RN WebView 위치 정보 수신 성공:', message.data);
              console.log('📍 위도:', message.data.latitude);
              console.log('📍 경도:', message.data.longitude);
              resolve({
                lat: message.data.latitude,
                lng: message.data.longitude
              });
            } else if (message.error) {
              console.error('📍 RN WebView 위치 정보 수신 실패:', message.error);
              reject(new Error(message.error));
            }
            // 리스너 정리
            if ((window as any).ReactNativeWebView) {
              (window as any).ReactNativeWebView.onMessage = null;
            }
            document.removeEventListener('message', documentMessageHandler);
            window.removeEventListener('message', documentMessageHandler);
          } else {
            console.log('📍 LOCATION_RESPONSE가 아닌 메시지:', message.type);
          }
        } catch (error) {
          console.error('📍 RN WebView 메시지 파싱 오류:', error);
        }
      };

      // React Native WebView 메시지 리스너 설정 (여러 방법 시도)
      if ((window as any).ReactNativeWebView) {
        console.log('📍 ReactNativeWebView.onMessage 리스너 설정');
        (window as any).ReactNativeWebView.onMessage = handleRNWebViewMessage;
      } else {
        console.error('❌ ReactNativeWebView가 없습니다!');
      }

      // 추가: document 이벤트 리스너도 설정
      const documentMessageHandler = (event: any) => {
        console.log('📍 document 메시지 수신:', event.data || event.detail);
        if (event.data) {
          handleRNWebViewMessage(event.data);
        } else if (event.detail) {
          handleRNWebViewMessage(event.detail);
        }
      };

      document.addEventListener('message', documentMessageHandler);
      window.addEventListener('message', documentMessageHandler);

      setTimeout(() => {
        if ((window as any).ReactNativeWebView) {
          (window as any).ReactNativeWebView.onMessage = null;
        }
        document.removeEventListener('message', documentMessageHandler);
        window.removeEventListener('message', documentMessageHandler);
        console.log('📍 위치 요청 타임아웃');
        reject(new Error('Location request timeout'));
      }, 10000);
    });
  };

  const handleNavigation = async (type: 'apple' | 'google') => {
    if (!isApp) {
      alert(t('appOnlyMessage'));
      return;
    }

    setIsLoading(true);
    try {
      // 현재 위치 정보 가져오기
      const currentLocation = await getCurrentLocation();
      
      if (type === 'apple') {
        const url = generateDeepLinks.appleMaps({
          currentLocation,
          destination,
          destinationName: destination.name,
          destinationAddress: destination.address
        });
        console.log('🍎 애플 지도 딥링크:', url);
        requestOpenDeepLink(url);
      } else if (type === 'google') {
        const url = generateDeepLinks.googleMaps({
          currentLocation,
          destination,
          destinationName: destination.name,
          destinationAddress: destination.address
        });
        console.log('🗺️ 구글 지도 딥링크:', url);
        requestOpenDeepLink(url);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      alert('위치 정보를 가져올 수 없습니다.');
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{t('directions')}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {!isApp && (
            <div className={styles.appOnlyMessage}>
              {t('appOnlyMessage')}
            </div>
          )}
          
          <div className={styles.options}>
            <button 
              className={styles.optionButton}
              onClick={() => handleNavigation('apple')}
              disabled={!isApp || isLoading}
            >
              <div className={styles.optionIcon}>
                <img src="/assets/location-icons/apple-map.png" alt="Apple Maps" />
              </div>
              <div className={styles.optionText}>
                <div className={styles.optionTitle}>{t('appleMapsNavigation')}</div>
                <div className={styles.optionSubtitle}>Apple Maps</div>
              </div>
              <div className={styles.selectButton}>{t('selectOption')}</div>
            </button>
            
            <button 
              className={styles.optionButton}
              onClick={() => handleNavigation('google')}
              disabled={!isApp || isLoading}
            >
              <div className={styles.optionIcon}>
                <img src="/assets/location-icons/google-map.png" alt="Google Maps" />
              </div>
              <div className={styles.optionText}>
                <div className={styles.optionTitle}>{t('googleMapsNavigation')}</div>
                <div className={styles.optionSubtitle}>Google Maps</div>
              </div>
              <div className={styles.selectButton}>{t('selectOption')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
