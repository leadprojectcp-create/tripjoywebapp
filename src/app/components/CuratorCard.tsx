'use client';

import React, { useState } from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import { CuratorData } from '../services/curatorService';
import './CuratorCard.css';

interface CuratorCardProps {
  curator: CuratorData;
}

export const CuratorCard: React.FC<CuratorCardProps> = ({ curator }) => {
  const { t } = useTranslationContext();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(curator.followersCount || 52);

  // 국가코드를 현재 언어의 국가명으로 변환하는 함수
  const translateCountry = (countryCode: string): string => {
    if (!countryCode) return '';
    
    // 기본값들은 그대로 반환 (번역하지 않음)
    if (countryCode === '위치 미상' || countryCode === '사용자') {
      return countryCode;
    }
    
    try {
      return t(`countries.${countryCode}`);
    } catch (error) {
      return countryCode; // 번역이 없으면 원본 반환
    }
  };

  // 생년월일로부터 나이 계산
  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    
    try {
      // "2020년 6월 7일 오전 12시 0분 0초 UTC+9" 형식 파싱
      const koreanDateRegex = /(\d{4})년 (\d{1,2})월 (\d{1,2})일/;
      const match = birthDateString.match(koreanDateRegex);
      
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        
        const birthDate = new Date(year, month, day);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
      
      // 일반적인 날짜 형식도 시도
      const birthDate = new Date(birthDateString);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
    } catch (error) {
      console.error('생년월일 파싱 오류:', error);
    }
    
    return 0;
  };

  // 성별을 현재 언어로 번역하는 함수
  const translateGender = (gender: string): string => {
    if (!gender) return '';
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male' || lowerGender === 'man' || lowerGender === '남성') {
      return t('male');
    } else if (lowerGender === 'female' || lowerGender === 'woman' || lowerGender === '여성') {
      return t('female');
    }
    return gender; // 번역이 없으면 원본 반환
  };

  // 팔로우 토글
  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    setFollowersCount(isFollowing ? followersCount - 1 : followersCount + 1);
    
    // TODO: 실제 API 호출
    console.log('팔로우 토글:', !isFollowing, 'curatorId:', curator.id);
  };

  const age = calculateAge(curator.birthDate || '');
  const gender = translateGender(curator.gender || '');

  return (
    <div className="curator-card">
      {/* 프로필 섹션 */}
      <div className="curator-profile">
        <div className="curator-avatar">
          {curator.profileImage ? (
            <img src={curator.profileImage} alt={curator.name} />
          ) : (
            <span className="avatar-initial">{curator.name.charAt(0)}</span>
          )}
        </div>
        
        <div className="curator-info">
          <h3 className="curator-name">{curator.name}</h3>
          <div className="curator-details">
            {age > 0 && <span>{age}{t('ageUnit') || '세'}</span>}
            {gender && <span>{gender}</span>}
            {(curator.location || curator.nationality) && (
              <span>
                {translateCountry(curator.location || curator.nationality || '')}
              </span>
            )}
          </div>
        </div>

        <button 
          className={`follow-btn ${isFollowing ? 'following' : ''}`}
          onClick={handleFollowToggle}
        >
          {isFollowing ? (t('following') || '팔로잉') : (t('follow') || '팔로우')}
        </button>
      </div>

      {/* 통계 섹션 */}
      <div className="curator-stats">
        <div className="stat-item">
          <span className="stat-label">{t('posts') || '게시물'}</span>
          <span className="stat-value">{curator.postsCount || 52}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t('followers') || '팔로워'}</span>
          <span className="stat-value">{followersCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">{t('following') || '팔로잉'}</span>
          <span className="stat-value">{curator.followingCount || 12}</span>
        </div>
      </div>
    </div>
  );
};
