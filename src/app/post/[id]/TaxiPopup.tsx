'use client';

import { useState } from 'react';
import { getAppEnvironment, requestLocationFromApp, requestOpenDeepLink, isMessageType } from '../../../utils/appBridge';
import { generateDeepLinks } from '../../utils/deepLinks';
import { useTranslationContext } from '../../contexts/TranslationContext';
import styles from './TaxiPopup.module.css';

interface TaxiPopupProps {
  isOpen: boolean;
  onClose: () => void;
  destination: {
    lat: number;
    lng: number;
    name?: string;
  };
}

const taxiServices = [
  { id: 'grab', name: 'Grab', icon: '/assets/location-icons/grab.png', color: '#00B14F', translationKey: 'grabCall', subtitleKey: 'southeastAsiaRecommended' },
  { id: 'indrive', name: 'indrive', icon: '/assets/location-icons/indrive.png', color: '#FF6B35', translationKey: 'indriveCall', subtitleKey: 'southeastAsiaRecommended' },
  { id: 'kakaoT', name: '카카오T', icon: '/assets/location-icons/kakaot.png', color: '#FFCD00', translationKey: 'kakaoTCall', subtitleKey: 'koreaRecommended' },
  { id: 'didi', name: 'DiDi', icon: '/assets/location-icons/didi.png', color: '#FF6900', translationKey: 'didiCall', subtitleKey: 'chinaRecommended' },
  { id: 'go', name: 'GO', icon: '/assets/location-icons/go.png', color: '#000000', translationKey: 'goCall', subtitleKey: 'japanRecommended' }
];

export const TaxiPopup = ({ isOpen, onClose, destination }: TaxiPopupProps) => {
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

      console.log('🚗 택시 위치 정보 요청 시작');
      
      // 앱에서 위치 정보 요청
      requestLocationFromApp();
      
      // React Native WebView 메시지 리스너 설정 (NavigationPopup과 동일한 방식)
      const handleRNWebViewMessage = (data: string) => {
        try {
          console.log('🚗 택시 RN WebView 메시지 수신:', data);
          const message = JSON.parse(data);
          console.log('🚗 택시 파싱된 메시지:', message);
          console.log('🚗 택시 메시지 타입 확인:', message.type);
          
          if (message.type === 'LOCATION_RESPONSE') {
            console.log('🚗 택시 LOCATION_RESPONSE 메시지 확인됨');
            if (message.data) {
              console.log('🚗 택시 RN WebView 위치 정보 수신 성공:', message.data);
              console.log('🚗 택시 위도:', message.data.latitude);
              console.log('🚗 택시 경도:', message.data.longitude);
              resolve({
                lat: message.data.latitude,
                lng: message.data.longitude
              });
            } else if (message.error) {
              console.error('🚗 택시 RN WebView 위치 정보 수신 실패:', message.error);
              reject(new Error(message.error));
            }
            // 리스너 정리
            if ((window as any).ReactNativeWebView) {
              (window as any).ReactNativeWebView.onMessage = null;
            }
            document.removeEventListener('message', documentMessageHandler);
            window.removeEventListener('message', documentMessageHandler);
          } else {
            console.log('🚗 택시 LOCATION_RESPONSE가 아닌 메시지:', message.type);
          }
        } catch (error) {
          console.error('🚗 택시 RN WebView 메시지 파싱 오류:', error);
        }
      };

      // React Native WebView 메시지 리스너 설정 (여러 방법 시도)
      if ((window as any).ReactNativeWebView) {
        console.log('🚗 택시 ReactNativeWebView.onMessage 리스너 설정');
        (window as any).ReactNativeWebView.onMessage = handleRNWebViewMessage;
      } else {
        console.error('❌ 택시 ReactNativeWebView가 없습니다!');
      }

      // 추가: document 이벤트 리스너도 설정
      const documentMessageHandler = (event: any) => {
        console.log('🚗 택시 document 메시지 수신:', event.data || event.detail);
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
        console.log('🚗 택시 위치 요청 타임아웃');
        reject(new Error('Location request timeout'));
      }, 10000);
    });
  };

  const handleTaxiCall = async (serviceId: string) => {
    if (!isApp) {
      alert(t('appOnlyMessage'));
      return;
    }

    setIsLoading(true);
    try {
      const currentLocation = await getCurrentLocation();
      
      let url = '';
      switch (serviceId) {
        case 'grab':
          url = generateDeepLinks.grab({ currentLocation, destination, destinationName: destination.name });
          break;
        case 'indrive':
          url = generateDeepLinks.indrive({ currentLocation, destination, destinationName: destination.name });
          break;
        case 'kakaoT':
          url = generateDeepLinks.kakaoT({ currentLocation, destination, destinationName: destination.name });
          break;
        case 'didi':
          url = generateDeepLinks.didi({ currentLocation, destination, destinationName: destination.name });
          break;
        case 'go':
          url = generateDeepLinks.go({ currentLocation, destination, destinationName: destination.name });
          break;
        default:
          throw new Error('Unknown taxi service');
      }
      
      console.log('🚕 택시 딥링크:', url);
      requestOpenDeepLink(url);
    } catch (error) {
      console.error('Taxi call error:', error);
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
          <h3>{t('callTaxi')}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          {!isApp && (
            <div className={styles.appOnlyMessage}>
              {t('appOnlyMessage')}
            </div>
          )}
          
          <div className={styles.options}>
            {taxiServices.map((service) => (
              <button 
                key={service.id}
                className={styles.optionButton}
                onClick={() => handleTaxiCall(service.id)}
                disabled={!isApp || isLoading}
              >
                <div className={styles.optionIcon}>
                  <img src={service.icon} alt={service.name} />
                </div>
                <div className={styles.optionText}>
                  <div className={styles.optionTitle}>{t(service.translationKey)}</div>
                  <div className={styles.optionSubtitle}>{t(service.subtitleKey)}</div>
                </div>
                <div className={styles.selectButton}>{t('selectOption')}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
