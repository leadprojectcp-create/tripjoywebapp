'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '../components/Sidebar';
import { AppBar } from '../components/AppBar';
import { BottomNavigator } from '../components/BottomNavigator';
import { useAuthContext } from '../contexts/AuthContext';
import { useTranslationContext } from '../contexts/TranslationContext';
import { AuthGuard } from '../components/AuthGuard';
import { getUserInfo } from '../auth/services/authService';
import { createCompanionRequest } from '../services/companionRequestService';
import GoogleMapsLocationPicker, { LocationDetails } from '../components/GoogleMapsLocationPicker';
import './style.css';

interface UserInfo {
  id: string;
  name: string;
  photoUrl: string;
  location: string;
  gender: string;
  birthDate: string;
}

// useSearchParams를 사용하는 컴포넌트를 Suspense로 감싸기 위한 래퍼
const CompanionRequestContent: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const targetUserId = searchParams.get('userId');
  const [targetUser, setTargetUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 폼 데이터
  const [selectedPlace, setSelectedPlace] = useState('');
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  
  // 달력 관련 상태
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  
  // 시간 슬롯
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];



  // 대상 사용자 정보 로드
  useEffect(() => {
    const loadTargetUser = async () => {
      if (!targetUserId) {
        router.push('/dashboard');
        return;
      }

      try {
        setIsLoading(true);
        const userInfo = await getUserInfo(targetUserId);
        if (userInfo) {
          setTargetUser({
            id: targetUserId,
            name: userInfo.name || '사용자',
            photoUrl: userInfo.photoUrl || '',
            location: userInfo.location || '',
            gender: userInfo.gender || '',
            birthDate: userInfo.birthDate || ''
          });
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadTargetUser();
  }, [targetUserId, router]);

  // 달력 생성
  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setCalendarDays(days);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleLocationSelect = (location: string, details: LocationDetails | null) => {
    setSelectedPlace(location);
    setLocationDetails(details);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!selectedPlace || !selectedDate || !selectedTime || !user?.uid || !targetUserId) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      // 동행신청 데이터 생성
      const requestData = {
        requesterId: user.uid,
        targetUserId: targetUserId,
        place: selectedPlace,
        date: selectedDate,
        time: selectedTime,
        locationDetails: locationDetails
      };

      // 데이터베이스에 저장
      const requestId = await createCompanionRequest(requestData);
      
      console.log('✅ 동행신청 완료:', requestId);
      alert('동행신청이 완료되었습니다.');
      router.back();
    } catch (error) {
      console.error('❌ 동행신청 실패:', error);
      alert('동행신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isSelected = (date: Date) => {
    return selectedDate && isSameDay(date, selectedDate);
  };

  if (isLoading) {
    return (
      <div className="companion-request-main-content">
        <div className="companion-request-loading">
          <div className="loading-spinner">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="companion-request-main-content">
      <div className="companion-request-container">
        <h1 className="companion-request-title">동행신청하기</h1>
        
        {/* 사용자 프로필 */}
        <div className="user-profile-section">
          <div className="user-avatar">
            {targetUser?.photoUrl ? (
              <img src={targetUser.photoUrl} alt={targetUser.name} />
            ) : (
              <div className="avatar-placeholder">👤</div>
            )}
          </div>
          <div className="user-info">
            <h3 className="user-name">{targetUser?.name}</h3>
            <p className="user-details">
              {targetUser?.location && `${targetUser.location}`}
              {targetUser?.gender && `, ${targetUser.gender}`}
              {targetUser?.birthDate && `, ${calculateAge(targetUser.birthDate)}세`}
            </p>
          </div>
        </div>

        {/* 장소 입력 */}
        <div className="place-section">
          <label className="section-label">장소</label>
          <GoogleMapsLocationPicker
            initialLocation={selectedPlace}
            locationDetails={locationDetails}
            onLocationSelect={handleLocationSelect}
            className="companion-request-location-picker"
          />
        </div>

        {/* 날짜 선택 */}
        <div className="date-section">
          <label className="section-label">날짜</label>
          <div className="calendar">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={handlePrevMonth}>
                &lt;
              </button>
              <h3 className="calendar-title">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </h3>
              <button className="calendar-nav-btn" onClick={handleNextMonth}>
                &gt;
              </button>
            </div>
            
            <div className="calendar-weekdays">
              {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            
            <div className="calendar-days">
              {calendarDays.map((date, index) => (
                <button
                  key={index}
                  className={`calendar-day ${
                    isToday(date) ? 'today' : ''
                  } ${
                    isSelected(date) ? 'selected' : ''
                  } ${
                    date.getMonth() !== currentMonth.getMonth() ? 'other-month' : ''
                  }`}
                  onClick={() => handleDateSelect(date)}
                >
                  {date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 시간 선택 */}
        <div className="time-section">
          <label className="section-label">시간</label>
          <div className="time-slots">
            {timeSlots.map(time => (
              <button
                key={time}
                className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                onClick={() => handleTimeSelect(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="action-buttons">
          <button className="cancel-btn" onClick={handleCancel}>
            취소
          </button>
          <button className="submit-btn" onClick={handleSubmit}>
            동행신청
          </button>
        </div>
      </div>
    </div>
  );
};

const CompanionRequestPage: React.FC = () => {
  return (
    <AuthGuard>
      <div className="companion-request-page">
        <AppBar />
        <div className="companion-request-main-layout">
          <Sidebar />
          <Suspense fallback={
            <div className="companion-request-main-content">
              <div className="companion-request-loading">
                <div className="loading-spinner">로딩 중...</div>
              </div>
            </div>
          }>
            <CompanionRequestContent />
          </Suspense>
        </div>
        <BottomNavigator />
      </div>
    </AuthGuard>
  );
};

// 나이 계산 함수
const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

export default CompanionRequestPage;
