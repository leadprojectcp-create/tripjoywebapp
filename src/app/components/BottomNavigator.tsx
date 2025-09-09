"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslationContext } from "../contexts/TranslationContext";
import "./BottomNavigator.css";

// SVG 아이콘 컴포넌트들
const HomeIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/home_active.svg" 
        alt="Home Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/home.svg" 
      alt="Home" 
      width={28} 
      height={28}
    />
  );
};


const PostIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/upload_active.svg" 
        alt="Post Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/upload.svg" 
      alt="Post" 
      width={28} 
      height={28}
    />
  );
};

const ActivityIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/activity_active.svg" 
        alt="Activity Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/activity.svg" 
      alt="Activity" 
      width={28} 
      height={28}
    />
  );
};

const ProfileIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/profile_active.svg" 
        alt="Profile Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/profile.svg" 
      alt="Profile" 
      width={28} 
      height={28}
    />
  );
};

const TripTourIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export const BottomNavigator = (): React.JSX.Element => {
  const { t } = useTranslationContext();
  const pathname = usePathname();

  // 현재 경로에 따라 active 상태 결정
  const isActive = (path: string) => {
    if (path === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) {
      return true;
    }
    return pathname === path;
  };

  return (
    <div className="bottom-navigator">
      <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <div className="nav-icon">
          <HomeIcon isActive={isActive('/')} />
        </div>
        <span>{t('home')}</span>
      </Link>
      
      
      <Link href="/post-upload" className={`nav-item ${isActive('/post-upload') ? 'active' : ''}`}>
        <div className="nav-icon">
          <PostIcon isActive={isActive('/post-upload')} />
        </div>
        <span>{t('uploadPost')}</span>
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
    </div>
  );
};
