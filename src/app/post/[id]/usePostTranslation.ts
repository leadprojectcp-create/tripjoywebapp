'use client';

import { useState, useCallback, useEffect } from 'react';
import { PostData } from '../../services/postService';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { translateTextAuto, LANGUAGE_CODES, LanguageCode } from '../../services/translateService';

export const usePostTranslation = (post: PostData | null) => {
  const { currentLanguage } = useTranslationContext();
  
  // 번역 상태
  const [translatedBusinessHours, setTranslatedBusinessHours] = useState<string | null>(null);
  const [translatedRecommendedMenu, setTranslatedRecommendedMenu] = useState<string | null>(null);
  const [translatedAddress, setTranslatedAddress] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // 자동 번역 함수
  const translateContent = useCallback(async (text: string, type: 'businessHours' | 'recommendedMenu' | 'address') => {
    console.log('translateContent 호출:', { text, type, currentLanguage, isTranslating });
    
    if (!text || isTranslating) {
      console.log('번역 건너뜀:', { text: !!text, isTranslating });
      return;
    }

    try {
      setIsTranslating(true);
      const targetLanguage = LANGUAGE_CODES[currentLanguage as LanguageCode];
      console.log('번역 시작:', { text, targetLanguage, currentLanguage, availableLanguages: Object.keys(LANGUAGE_CODES) });
      
      if (!targetLanguage) {
        console.error('지원하지 않는 언어:', currentLanguage);
        return;
      }
      
      const translated = await translateTextAuto(text, targetLanguage);
      console.log('번역 완료:', { original: text, translated });
      
      switch (type) {
        case 'businessHours':
          setTranslatedBusinessHours(translated);
          break;
        case 'recommendedMenu':
          setTranslatedRecommendedMenu(translated);
          break;
        case 'address':
          setTranslatedAddress(translated);
          break;
      }
    } catch (error) {
      console.error('번역 실패:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, isTranslating]);

  // 게시물 데이터가 로드되면 자동으로 번역 실행
  useEffect(() => {
    console.log('번역 useEffect 실행:', {
      post: !!post,
      currentLanguage,
      businessHours: post?.businessHours,
      recommendedMenu: post?.recommendedMenu,
      address: post?.location?.address,
      translatedBusinessHours,
      translatedRecommendedMenu,
      translatedAddress
    });

    if (post && currentLanguage && currentLanguage !== 'ko') { // 한국어가 아닐 때만 번역
      if (post.businessHours && !translatedBusinessHours) {
        console.log('영업시간 번역 시작:', post.businessHours);
        translateContent(post.businessHours, 'businessHours');
      }
      if (post.recommendedMenu && !translatedRecommendedMenu) {
        console.log('추천메뉴 번역 시작:', post.recommendedMenu);
        translateContent(post.recommendedMenu, 'recommendedMenu');
      }
      if (post.location?.address && !translatedAddress) {
        console.log('주소 번역 시작:', post.location.address);
        translateContent(post.location.address, 'address');
      }
    }
  }, [post, currentLanguage]); // 의존성 배열에서 translateContent와 번역 상태 제거

  return {
    translatedBusinessHours,
    translatedRecommendedMenu,
    translatedAddress,
    isTranslating,
    translateContent
  };
};
