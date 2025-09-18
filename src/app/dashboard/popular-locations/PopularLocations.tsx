'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useTranslationContext } from '../../contexts/TranslationContext';
import styles from '../style.module.css';

interface LocationCount {
  cityCode: string;
  countryCode: string;
  count: number;
  latestPostImage?: string;
  cityName?: string;
  countryName?: string;
}

interface PopularLocationsProps {
  onLocationSelect: (countryCode: string, cityCode: string) => void;
}

export const PopularLocations: React.FC<PopularLocationsProps> = ({ onLocationSelect }) => {
  const { t, currentLanguage } = useTranslationContext();
  const [locations, setLocations] = useState<LocationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<Record<string, any>>({});

  // 도시 데이터 로드
  const loadCityData = async (countryCode: string) => {
    if (cityData[countryCode]) return cityData[countryCode];
    
    try {
      const response = await fetch(`/data/cities-${countryCode.toLowerCase()}.json`);
      if (response.ok) {
        const data = await response.json();
        setCityData(prev => ({ ...prev, [countryCode]: data }));
        return data;
      }
    } catch (error) {
      console.error(`도시 데이터 로드 실패 (${countryCode}):`, error);
    }
    return null;
  };

  // 도시 이름 가져오기
  const getCityName = (countryCode: string, cityCode: string) => {
    const countryData = cityData[countryCode];
    if (!countryData) return cityCode;
    
    const city = countryData.cities?.find((c: any) => c.code === cityCode);
    if (city && city.names) {
      return city.names[currentLanguage] || city.names['ko'] || city.names['en'] || cityCode;
    }
    return cityCode;
  };

  useEffect(() => {
    const fetchPopularLocations = async () => {
      try {
        setLoading(true);
        
        // 임시로 전체 게시물 확인 (디버깅용)
        console.log('인기 지역 데이터 로딩 시작 - 전체 게시물 확인');
        
        // 전체 게시물들 가져오기 (최근 100개)
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const postsSnapshot = await getDocs(postsQuery);
        console.log('이번 달 게시물 수:', postsSnapshot.docs.length);
        
        // 위치별로 그룹화하고 카운트
        const locationMap = new Map<string, LocationCount>();
        
        postsSnapshot.docs.forEach((doc) => {
          const post = doc.data();
          console.log('게시물 데이터:', {
            id: doc.id,
            location: post.location,
            countryCode: post.countryCode,
            cityCode: post.cityCode,
            hasLocation: !!post.location
          });
          
          // location 객체에서 nationality와 city를 확인
          const countryCode = post.location?.nationality || post.countryCode;
          const cityCode = post.location?.city || post.cityCode;
          
          if (countryCode && cityCode) {
            const key = `${countryCode}-${cityCode}`;
            const existing = locationMap.get(key);
            
            if (existing) {
              existing.count++;
              // 가장 최신 게시물의 이미지 사용 (기존에 이미지가 없는 경우만)
              if (!existing.latestPostImage && post.images && post.images.length > 0) {
                existing.latestPostImage = post.images[0].url;
              }
            } else {
              locationMap.set(key, {
                cityCode: cityCode,
                countryCode: countryCode,
                count: 1,
                latestPostImage: post.images && post.images.length > 0 ? post.images[0].url : undefined,
                cityName: post.location?.cityName || cityCode,
                countryName: post.location?.countryName || countryCode
              });
            }
          }
        });

        // 카운트 순으로 정렬하고 상위 10개만 선택
        const sortedLocations = Array.from(locationMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        console.log('위치 맵 크기:', locationMap.size);
        console.log('위치 맵 내용:', Array.from(locationMap.entries()));
        console.log('인기 지역 결과:', sortedLocations);
        
        // 각 국가의 도시 데이터 로드
        const uniqueCountries = [...new Set(sortedLocations.map(loc => loc.countryCode))];
        await Promise.all(uniqueCountries.map(countryCode => loadCityData(countryCode)));
        
        setLocations(sortedLocations);
      } catch (error) {
        console.error('인기 지역 데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularLocations();
  }, []);

  const handleLocationClick = (location: LocationCount) => {
    console.log('인기 지역 클릭:', location);
    onLocationSelect(location.countryCode, location.cityCode);
  };

  if (loading) {
    return (
      <div className={styles['popular-locations']}>
        <h3>
          <img src="/icons/real-check.svg" alt="실시간" width="20" height="20" />
          {t('realtimePopularAreas')}
        </h3>
        <div className={styles['loading-popular-areas']}>
          {t('loadingPopularAreas')}
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={styles['popular-locations']}>
        <h3>
          <img src="/icons/real-check.svg" alt="실시간" width="20" height="20" />
          {t('realtimePopularAreas')}
        </h3>
        <div className={styles['no-popular-areas']}>
          {t('noPopularAreas')}
        </div>
      </div>
    );
  }

  return (
    <div className={styles['popular-locations']}>
      <h3>
        <img src="/icons/real-check.svg" alt="인기" width="20" height="20" />
        {t('realtimePopularAreas')}
      </h3>
      <div className={styles['locations-grid']}>
        {locations.map((location, index) => (
          <div
            key={`${location.countryCode}-${location.cityCode}`}
            className={styles['location-item']}
            onClick={() => handleLocationClick(location)}
          >
            <div className={styles['location-image']}>
              {location.latestPostImage ? (
                <img
                  src={`${location.latestPostImage}?width=160&fit=cover&quality=100`}
                  alt={`${location.cityName || location.cityCode} 이미지`}
                  loading="lazy"
                />
              ) : (
                <div className={styles['location-placeholder']}>
                  <img src="/icons/location_pin.svg" alt="위치" width="24" height="24" />
                </div>
              )}
            </div>
            <div className={styles['location-info']}>
              <span className={styles['location-name']}>
                {getCityName(location.countryCode, location.cityCode)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
