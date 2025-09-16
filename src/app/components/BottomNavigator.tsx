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
      src="/icons/upload.png" 
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
      src="/icons/profile.png" 
      alt="Profile" 
      width={28} 
      height={28}
    />
  );
};

const TripTourIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/triptour_active.svg" 
        alt="Trip Tour Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/triptour.png" 
      alt="Trip Tour" 
      width={28} 
      height={28}
    />
  );
};

const ChatIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/message_active.svg" 
        alt="Chat Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/message.png" 
      alt="Chat" 
      width={28} 
      height={28}
    />
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
      
      <Link href="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
        <div className="nav-icon">
          <ChatIcon isActive={isActive('/chat')} />
        </div>
        <span>{t('chat')}</span>
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
