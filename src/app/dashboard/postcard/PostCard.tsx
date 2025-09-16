'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PostData } from '../../services/postService';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { PostHeader } from './PostHeader';
import { PostMedia } from './PostMedia';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: PostData;
  userInfo?: {
    name: string;
    location: string;
    profileImage?: string;
    photoUrl?: string;
  };
  currentUser?: any;
  showUserInfo?: boolean;
  cardClassName?: string;
  aboveTheFold?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  userInfo = { name: '사용자', location: '위치 미상' },
  currentUser,
  showUserInfo = true,
  cardClassName,
  aboveTheFold = false
}) => {
  const { t, currentLanguage } = useTranslationContext();
  const router = useRouter();
  const [cityData, setCityData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);

  const imageUrls = useMemo(() => (post.images || []).map((i: any) => i.url || i.urls?.original).filter(Boolean), [post.images]);
  const mediaImages = useMemo(() => imageUrls.map(url => ({ url })), [imageUrls]);

  const handleImageClick = useCallback(() => {
    if (post.id) router.push(`/post/${post.id}`);
  }, [post.id, router]);

  // 국가 데이터 로드
  useEffect(() => {
    const loadCountryData = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        setCountryData(data.countries || []);
      } catch (error) {
        console.error('국가 데이터 로드 실패:', error);
      }
    };
    loadCountryData();
  }, []);

  // 도시 데이터 로드 (국가 데이터 로드 후)
  useEffect(() => {
    const loadCityData = async () => {
      if (!post.location?.nationality || countryData.length === 0) return;
      
      // countries.json에서 국가 찾기
      const country = countryData.find(c => c.code === post.location?.nationality);
      if (!country) return;
      
      // CountryAndCitySelector와 동일한 매핑 사용
      const countryFileMap: Record<string, string> = {
        'ko': 'kr',
        'en': 'us',
        'vi': 'vn',
        'zh': 'cn',
        'ja': 'jp',
        'th': 'th',
        'fil': 'ph'
      };
      
      const fileName = countryFileMap[country.name];
      if (!fileName) return;
      
      try {
        const response = await fetch(`/data/cities-${fileName}.json`);
        const data = await response.json();
        setCityData(data.cities || []);
      } catch (error) {
        console.error('도시 데이터 로드 실패:', error);
      }
    };
    
    loadCityData();
  }, [post.location?.nationality, countryData]);

  const translatePostLocation = useCallback(() => {
    // location 내부의 nationality와 city 필드 사용
    const nationalityCode = post.location?.nationality;
    const cityCode = post.location?.city;
    
    if (!nationalityCode && !cityCode) return '';
    
    // JSON 데이터에서 국가명 가져오기
    const getCountryName = (code: string) => {
      const country = countryData.find(c => c.code === code);
      if (country) {
        return country.names?.[currentLanguage] || country.names?.['en'] || code;
      }
      return code;
    };
    
    // JSON 데이터에서 도시명 가져오기
    const getCityName = (code: string) => {
      const city = cityData.find((c: any) => c.code === code);
      if (city) {
        return city.names?.[currentLanguage] || city.names?.['en'] || code;
      }
      return code;
    };
    
    const parts: string[] = [];
    if (cityCode) parts.push(getCityName(cityCode));
    if (nationalityCode) parts.push(getCountryName(nationalityCode));
    
    return parts.join(', ');
  }, [post.location?.nationality, post.location?.city, currentLanguage, cityData, countryData]);

  return (
    <div className={cardClassName}>
      <PostHeader
        post={post}
        userInfo={userInfo}
        showUserInfo={showUserInfo}
        showSettings={false}
        translatePostLocation={translatePostLocation}
      />

      <PostMedia
        images={mediaImages}
        onClickImage={handleImageClick}
        aboveTheFold={aboveTheFold}
        gridCount={4}
      />
    </div>
  );
};

export default PostCard;


