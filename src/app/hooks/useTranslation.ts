"use client";

import { useState, useEffect } from 'react';

type Language = 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil';

interface Translations {
  [key: string]: {
    [language: string]: string;
  };
}

// 지원하는 언어 목록  
const SUPPORTED_LANGUAGES: Language[] = ['ko', 'en', 'vi', 'zh', 'ja', 'th', 'fil'];

// 브라우저 언어를 지원하는 언어로 매핑
const getBrowserLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ko'; // 서버 사이드에서는 기본값
  
  const browserLang = navigator.language.toLowerCase();
  console.log('🌐 Browser language detected:', browserLang);
  
  // 한국어 감지
  if (browserLang.startsWith('ko')) {
    console.log('🇰🇷 Korean language detected');
    return 'ko';
  }
  
  // 베트남어 감지
  if (browserLang.startsWith('vi')) {
    console.log('🇻🇳 Vietnamese language detected');
    return 'vi';
  }
  
  // 중국어 감지 (간체, 번체)
  if (browserLang.startsWith('zh')) {
    console.log('🇨🇳 Chinese language detected');
    return 'zh';
  }
  
  // 일본어 감지
  if (browserLang.startsWith('ja')) {
    console.log('🇯🇵 Japanese language detected');
    return 'ja';
  }
  
  // 태국어 감지
  if (browserLang.startsWith('th')) {
    console.log('🇹🇭 Thai language detected');
    return 'th';
  }
  
  // 필리핀어 감지
  if (browserLang.startsWith('fil') || browserLang.startsWith('tl')) {
    console.log('🇵🇭 Filipino language detected');
    return 'fil';
  }
  
  // 영어 또는 기타 언어
  console.log('🇺🇸 English (or other) language detected');
  return 'en';
};

export const useTranslation = () => {
  const [translations, setTranslations] = useState<Translations>({});
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ko');
  const [isLoading, setIsLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 클라이언트 hydration 상태 설정
    setIsHydrated(true);
    
    const loadTranslations = async () => {
      try {
        // 여러 번역 파일 로드
        const [sidebarResponse, authResponse, signupResponse, termsResponse, userinfoResponse, profileResponse, postUploadResponse, dashboardResponse, curatorsResponse, receivedCompanionsResponse, requestedCompanionsResponse] = await Promise.all([
          fetch('/translations/sidebar.json'),
          fetch('/translations/auth.json'),
          fetch('/translations/signup.json'),
          fetch('/translations/terms.json'),
          fetch('/translations/userinfo.json'),
          fetch('/translations/profile.json'),
          fetch('/translations/post-upload.json'),
          fetch('/translations/dashboard.json'),
          fetch('/translations/curators.json'),
          fetch('/translations/received-companions.json'),
          fetch('/translations/requested-companions.json')
        ]);
        
        const sidebarData = await sidebarResponse.json();
        const authData = await authResponse.json();
        const signupData = await signupResponse.json();
        const termsData = await termsResponse.json();
        const userinfoData = await userinfoResponse.json();
        const profileData = await profileResponse.json();
        const postUploadData = await postUploadResponse.json();
        const dashboardData = await dashboardResponse.json();
        const curatorsData = await curatorsResponse.json();
        const receivedCompanionsData = await receivedCompanionsResponse.json();
        const requestedCompanionsData = await requestedCompanionsResponse.json();
        
        // 번역 데이터 병합
        const mergedTranslations = { 
          ...sidebarData, 
          ...authData, 
          ...signupData, 
          ...termsData, 
          ...userinfoData,
          ...profileData,
          ...postUploadData,
          ...dashboardData,
          ...curatorsData,
          ...receivedCompanionsData,
          ...requestedCompanionsData
        };
        console.log('📚 Loaded translations:', mergedTranslations);
        setTranslations(mergedTranslations);
        
        // 저장된 언어 또는 브라우저 언어 감지
        const savedLanguage = localStorage.getItem('tripjoy_language') as Language;
        const languageToUse = savedLanguage || getBrowserLanguage();
        console.log('🎯 Setting language to:', languageToUse);
        setCurrentLanguage(languageToUse);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load translations:', error);
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, []);

  const t = (key: string): string => {
    console.log(`🔍 Translating key: ${key}, language: ${currentLanguage}, forceUpdate: ${forceUpdate}`);
    
    // SSR hydration mismatch 방지: 클라이언트가 준비되지 않은 상태에서는 빈 문자열 반환
    if (!isHydrated || isLoading) {
      return '';
    }
    
    // nested 키 처리 (예: destinations.danang)
    if (key.includes('.')) {
      const [mainKey, subKey] = key.split('.');
      if (!translations[mainKey]) {
        console.error(`Translation main key not found: ${mainKey}`, Object.keys(translations));
        return `[MISSING:${mainKey}]`;
      }
      
      if (!translations[mainKey][subKey]) {
        console.error(`Translation sub key not found: ${mainKey}.${subKey}`, translations[mainKey]);
        return `[MISSING:${mainKey}.${subKey}]`;
      }
      
      const translationData = translations[mainKey][subKey] as unknown as Record<Language, string>;
      const translation = translationData[currentLanguage];
      if (!translation) {
        console.error(`Translation not found for nested key: ${key}, language: ${currentLanguage}`, translations[mainKey][subKey]);
        return `[MISSING:${key}:${currentLanguage}]`;
      }
      
      console.log(`✅ Nested translation found: ${key} = ${translation}`);
      return translation;
    }
    
    // 일반 키 처리
    if (!translations[key]) {
      console.error(`Translation key not found: ${key}`, Object.keys(translations));
      return `[MISSING:${key}]`;
    }
    
    const translationData = translations[key] as Record<Language, string>;
    const translation = translationData[currentLanguage];
    if (!translation) {
      console.error(`Translation not found for key: ${key}, language: ${currentLanguage}`, translations[key]);
      return `[MISSING:${key}:${currentLanguage}]`;
    }
    
    console.log(`✅ Translation found: ${key} = ${translation}`);
    return translation;
  };

  const changeLanguage = (language: Language) => {
    console.log('🔄 Language changed to:', language);
    setCurrentLanguage(language);
    // 로컬 스토리지에 언어 설정 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('tripjoy_language', language);
    }
    // 강제 리렌더링
    setForceUpdate(prev => prev + 1);
  };

  const getCurrentLanguage = (): Language => {
    return currentLanguage;
  };

  const getSupportedLanguages = (): Language[] => {
    return SUPPORTED_LANGUAGES;
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    isLoading,
    isHydrated
  };
};
