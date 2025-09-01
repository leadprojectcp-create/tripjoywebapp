"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useAuthContext } from "../contexts/AuthContext";
import { SettingsModal } from "./SettingsModal";
import "./Sidebar.css";

// SVG 아이콘 컴포넌트들
const HomeIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/home_active.svg" 
        alt="Home Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/home.svg" 
      alt="Home" 
      width={24} 
      height={24}
    />
  );
};



const CuratorIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/curator_active.svg" 
        alt="Curator Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/curator.svg" 
      alt="Curator" 
      width={24} 
      height={24}
    />
  );
};

const MessageIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/message_active.svg" 
        alt="Message Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/message.svg" 
      alt="Message" 
      width={24} 
      height={24}
    />
  );
};

const ProfileIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/profile_active.svg" 
        alt="Profile Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/profile.svg" 
      alt="Profile" 
      width={24} 
      height={24}
    />
  );
};

const ActivityIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/activity_active.svg" 
        alt="Activity Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/activity.svg" 
      alt="Activity" 
      width={24} 
      height={24}
    />
  );
};

const TripTourIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const ReceiveIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/receive_active.svg" 
        alt="Receive Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/receive.svg" 
      alt="Receive" 
      width={24} 
      height={24}
    />
  );
};

const SendIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/send_active.svg" 
        alt="Send Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/send.svg" 
      alt="Send" 
      width={24} 
      height={24}
    />
  );
};

const SettingIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/setting_active.svg" 
        alt="Setting Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/setting.svg" 
      alt="Setting" 
      width={24} 
      height={24}
    />
  );
};

const PostIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/upload_active.svg" 
        alt="Post Active" 
        width={24} 
        height={24}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/upload.svg" 
      alt="Post" 
      width={24} 
      height={24}
    />
  );
};

const LogoutIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
  </svg>
);

interface SidebarProps {
  unreadMessageCount?: number;
}

export const Sidebar = ({ unreadMessageCount = 0 }: SidebarProps): React.JSX.Element => {
  const { t } = useTranslationContext();
  const { logout, isAuthenticated } = useAuthContext();

  // 웹뷰 환경 감지 함수
  const isWebView = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // iOS WebView 감지
    const isIOSWebView = /iphone|ipad|ipod/.test(userAgent) && 
                        /webkit/.test(userAgent) && 
                        !/safari/.test(userAgent);
    
    // Android WebView 감지
    const isAndroidWebView = /android/.test(userAgent) && 
                            /webkit/.test(userAgent) && 
                            !/chrome/.test(userAgent);
    
    // React Native WebView 감지
    const isReactNativeWebView = /react-native/.test(userAgent);
    
    // 기타 WebView 감지
    const isOtherWebView = /wv/.test(userAgent) || 
                          /mobile/.test(userAgent) && /safari/.test(userAgent);
    
    return isIOSWebView || isAndroidWebView || isReactNativeWebView || isOtherWebView;
  };

  // 웹뷰 환경에 맞는 로그아웃 처리
  const handleLogout = async () => {
    try {
      console.log('🔄 로그아웃 시작');
      
      // 기존 로그아웃 함수 호출
      await logout();
      
      // 웹뷰 환경에서는 추가 처리
      if (isWebView()) {
        console.log('📱 웹뷰 환경에서 로그아웃 처리');
        // 웹뷰에서는 메인 페이지로 리다이렉트
        router.push('/');
      }
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
      // 에러 발생 시에도 웹뷰 환경에 따라 리다이렉트
      if (isWebView()) {
        router.push('/');
      }
    }
  };
  const pathname = usePathname();
  const router = useRouter();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 설정 모달 핸들러
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  // 현재 경로에 따라 active 상태 결정
  const isActive = (path: string) => {
    if (path === '/' && (pathname === '/' || pathname === '/')) {
      return true;
    }
    return pathname === path;
  };

  // 게시물 업로드 페이지로 이동
  const handlePostUpload = () => {
    router.push('/post-upload');
  };

  return (
    <div className="sidebar">
      <nav className="nav-menu">
        <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
          <div className="nav-icon">
            <HomeIcon isActive={isActive('/')} />
          </div>
          <span>{t('home')}</span>
        </Link>
        
        <Link href="/curators" className={`nav-item ${isActive('/curators') ? 'active' : ''}`}>
          <div className="nav-icon">
            <CuratorIcon isActive={isActive('/curators')} />
          </div>
          <span>{t('curator')}</span>
        </Link>
        
        <div className={`nav-item ${isActive('/post-upload') ? 'active' : ''}`} onClick={handlePostUpload} style={{ cursor: 'pointer' }}>
          <div className="nav-icon">
            <PostIcon isActive={isActive('/post-upload')} />
          </div>
          <span>{t('uploadPost')}</span>
        </div>
        
        <Link href="/my-activity" className={`nav-item ${isActive('/my-activity') ? 'active' : ''}`}>
          <div className="nav-icon">
            <ActivityIcon isActive={isActive('/my-activity')} />
          </div>
          <span>{t('myActivity')}</span>
        </Link>
        
        <Link href="/trip-tour" className={`nav-item ${isActive('/trip-tour') ? 'active' : ''}`}>
          <div className="nav-icon">
            <TripTourIcon isActive={isActive('/trip-tour')} />
          </div>
          <span>트립투어</span>
        </Link>
        
        <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
          <div className="nav-icon">
            <ProfileIcon isActive={isActive('/profile')} />
          </div>
          <span>{t('profile')}</span>
        </Link>
        
        <Link href="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
          <div className="nav-icon">
            <MessageIcon isActive={isActive('/chat')} />
            {unreadMessageCount > 0 && (
              <div className="unread-dot"></div>
            )}
          </div>
          <span>{t('chat')}</span>
        </Link>
        
        <Link href="/received-companions" className={`nav-item ${isActive('/received-companions') ? 'active' : ''}`}>
          <div className="nav-icon">
            <ReceiveIcon isActive={isActive('/received-companions')} />
          </div>
          <span>{t('receivedCompanions')}</span>
        </Link>
        
        <Link href="/requested-companions" className={`nav-item ${isActive('/requested-companions') ? 'active' : ''}`}>
          <div className="nav-icon">
            <SendIcon isActive={isActive('/requested-companions')} />
          </div>
          <span>{t('requestedCompanions')}</span>
        </Link>
        
        <div 
          className={`nav-item ${isSettingsModalOpen ? 'active' : ''}`}
          onClick={handleSettingsClick}
        >
          <div className="nav-icon">
            <SettingIcon isActive={isSettingsModalOpen} />
          </div>
          <span>{t('settings')}</span>
        </div>
      </nav>
      
      {/* 로그아웃 버튼 (로그인된 경우에만 표시) */}
      {isAuthenticated && (
        <div className="logout-section">
          <div className="nav-item logout-item" onClick={handleLogout}>
            <div className="nav-icon">
              <LogoutIcon />
            </div>
            <span>{t('logout')}</span>
          </div>
        </div>
      )}
      
      {/* 설정 모달 - 포털로 렌더링됨 */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={handleCloseSettingsModal} 
      />
    </div>
  );
};
