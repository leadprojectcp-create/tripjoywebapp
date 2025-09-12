'use client';

import { useState, useEffect } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';

export const useLocationTranslation = (post?: any) => {
  const { currentLanguage, t } = useTranslationContext();
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // 국가 데이터 로드
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        setCountries(data.countries || []);
      } catch (error) {
        console.error('❌ 국가 데이터 로드 실패:', error);
      }
    };

    loadCountries();
  }, []);

  // 도시 데이터 로드 (게시물 위치의 국가가 변경될 때)
  useEffect(() => {
    const loadCities = async (countryCode: string) => {
      if (!countryCode) {
        setCities([]);
        return;
      }

      try {
        const selectedCountryData = countries.find(c => c.code === countryCode);
        if (!selectedCountryData) return;

        const countryFileMap: Record<string, string> = {
          'ko': 'kr', 'en': 'us', 'vi': 'vn', 'zh': 'cn',
          'ja': 'jp', 'th': 'th', 'fil': 'ph'
        };

        const fileName = countryFileMap[selectedCountryData.name];
        if (!fileName) return;

        const response = await fetch(`/data/cities-${fileName}.json`);
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error('❌ 도시 데이터 로드 실패:', error);
        setCities([]);
      }
    };

    // 게시물 위치의 국가 코드로 도시 데이터 로드
    if (post?.location?.nationality) {
      loadCities(post.location.nationality);
    }
  }, [post?.location?.nationality, countries]);

  // 국가코드를 현재 언어의 국가명으로 변환하는 함수
  const translateCountry = (countryCode: string): string => {
    if (!countryCode) return '';
    
    // 기본값들은 그대로 반환 (번역하지 않음)
    if (countryCode === '위치 미상' || countryCode === '사용자') {
      return countryCode;
    }
    
    if (!Array.isArray(countries) || countries.length === 0) return countryCode;
    const country = countries.find(c => c.code === countryCode);
    return country?.names[currentLanguage] || country?.names['en'] || countryCode;
  };

  // 도시코드를 현재 언어의 도시명으로 변환하는 함수
  const translateCity = (cityCode: string): string => {
    if (!cityCode) return '';
    
    if (!Array.isArray(cities) || cities.length === 0) return cityCode;
    const city = cities.find(c => c.code === cityCode);
    return city?.names[currentLanguage] || city?.names['en'] || cityCode;
  };

  // 게시물 위치 정보를 번역하는 함수 (PostCard와 동일)
  const translatePostLocation = (postLocation: any): string => {
    if (!postLocation) return '';
    
    // 국가/도시 코드가 있으면 번역하여 표시
    if (postLocation.nationality && postLocation.city) {
      const countryName = translateCountry(postLocation.nationality);
      const cityName = translateCity(postLocation.city);
      return `${countryName} · ${cityName}`;
    }
    
    // 장소명이 있으면 그대로 표시
    if (postLocation.name) {
      return postLocation.name;
    }
    
    // 기본값 없음
    return '';
  };

  // 결제 방법을 번역하는 함수
  const translatePaymentMethod = (paymentMethod: string): string => {
    if (!paymentMethod) return '';
    
    const method = paymentMethod.toLowerCase().trim();
    
    switch (method) {
      case 'card':
        return t('paymentCard');
      case 'cash':
        return t('paymentCash');
      case 'card or cash':
      case 'card or cash':
        return t('paymentCardOrCash');
      default:
        return paymentMethod; // 알 수 없는 값은 그대로 반환
    }
  };

  return {
    translateCountry,
    translateCity,
    translatePostLocation,
    translatePaymentMethod
  };
};
