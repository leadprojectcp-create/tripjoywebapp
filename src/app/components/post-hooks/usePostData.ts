'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

type LanguageKey = string; // 'ko' | 'en' ... (프로젝트 컨텍스트에 맞춰 유연 처리)

interface CountryItem {
  code: string;
  names: Record<LanguageKey, string>;
  name?: string; // 호환성 (기존 코드에서 name 사용)
}

interface CityItem {
  code: string;
  names: Record<LanguageKey, string>;
}

// 국가/도시 번역 및 로딩 훅
export const usePostLocationTranslations = (currentLanguage: LanguageKey | undefined, nationalityCode?: string | null) => {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);

  // 국가 로드
  useEffect(() => {
    let isMounted = true;
    const loadCountries = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        if (isMounted) setCountries(data.countries || []);
      } catch {
        if (isMounted) setCountries([]);
      }
    };
    loadCountries();
    return () => { isMounted = false; };
  }, []);

  // 도시 로드 (국가 코드에 따라)
  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      if (!nationalityCode) {
        if (isMounted) setCities([]);
        return;
      }
      try {
        const selectedCountry = countries.find(c => c.code === nationalityCode);
        if (!selectedCountry) return;

        // 기존 구현과 호환: 국가 이름 키를 파일 약어로 매핑
        const countryFileMap: Record<string, string> = {
          'ko': 'kr', 'en': 'us', 'vi': 'vn', 'zh': 'cn', 'ja': 'jp', 'th': 'th', 'fil': 'ph'
        };

        const fileName = countryFileMap[selectedCountry.name || ''] || countryFileMap[selectedCountry.code.toLowerCase()] || '';
        if (!fileName) {
          if (isMounted) setCities([]);
          return;
        }

        const response = await fetch(`/data/cities-${fileName}.json`);
        const data = await response.json();
        if (isMounted) setCities(data.cities || []);
      } catch {
        if (isMounted) setCities([]);
      }
    };
    loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nationalityCode, countries.length]);

  const translateCountry = useCallback((countryCode?: string) => {
    if (!countryCode) return '';
    if (countryCode === '위치 미상' || countryCode === '사용자') return countryCode;
    const country = countries.find(c => c.code === countryCode);
    return (country?.names?.[currentLanguage || ''] || country?.names?.['en'] || countryCode);
  }, [countries, currentLanguage]);

  const translateCity = useCallback((cityCode?: string) => {
    if (!cityCode) return '';
    const city = cities.find(c => c.code === cityCode);
    return (city?.names?.[currentLanguage || ''] || city?.names?.['en'] || cityCode);
  }, [cities, currentLanguage]);

  const translatePostLocation = useCallback((postLocation: any) => {
    if (!postLocation) return '';
    if (postLocation.nationality && postLocation.city) {
      const countryName = translateCountry(postLocation.nationality);
      const cityName = translateCity(postLocation.city);
      return `${countryName} · ${cityName}`;
    }
    if (postLocation.name) return postLocation.name;
    return '';
  }, [translateCountry, translateCity]);

  return { translateCountry, translateCity, translatePostLocation };
};

// 이미지 URL 정리 유틸
export const buildImageUrls = (images?: Array<{ url: string }>): string[] => {
  if (!images || images.length === 0) return [];
  return images.map(img => {
    let cleanUrl = img.url;
    if (cleanUrl.includes('tr:n-ik_ml_thumbnail')) {
      cleanUrl = cleanUrl.replace('tr:n-ik_ml_thumbnail/', '');
    }
    return cleanUrl;
  });
};

// 날짜 포맷 유틸 (PostCard의 안전 처리 로직)
export const formatPostDate = (timestamp: any, t: (k: string) => string) => {
  if (!timestamp) return t('justNow') || '방금 전';
  let date: Date | null = null;
  try {
    if (timestamp && typeof timestamp === 'object' && (timestamp as any).seconds) {
      date = new Date((timestamp as any).seconds * 1000);
    } else if (timestamp && typeof (timestamp as any).toDate === 'function') {
      date = (timestamp as any).toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
  } catch {
    date = null;
  }
  if (!date || isNaN(date.getTime())) return t('justNow') || '방금 전';
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('today') || '오늘';
  if (diffDays === 1) return t('oneDayAgo') || '1일 전';
  if (diffDays < 7) return `${diffDays}${t('daysAgoSuffix') || '일 전'}`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)}${t('weeksAgoSuffix') || '주 전'}`;
  return date.toLocaleDateString();
};


