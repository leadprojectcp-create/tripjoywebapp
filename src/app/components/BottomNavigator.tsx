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

const SearchIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/home_active.svg" 
        alt="Search Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/home.svg" 
      alt="Search" 
        width={28} 
        height={28}
    />
  );
};

const CuratorIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/curator_active.svg" 
        alt="Curator Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/curator.svg" 
      alt="Curator" 
              width={28} 
        height={28}
    />
  );
};

const MessageIcon = ({ isActive }: { isActive: boolean }) => {
  if (isActive) {
    return (
      <Image 
        src="/icons/message_active.svg" 
        alt="Message Active" 
        width={28} 
        height={28}
      />
    );
  }
  
  return (
    <Image 
      src="/icons/message.svg" 
      alt="Message" 
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
      <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
        <div className="nav-icon">
          <HomeIcon isActive={isActive('/dashboard')} />
        </div>
        <span>{t('home')}</span>
      </Link>
      
      <div className="nav-item">
        <div className="nav-icon">
          <SearchIcon isActive={false} />
        </div>
        <span>{t('search')}</span>
      </div>
      
      <div className="nav-item">
        <div className="nav-icon">
          <CuratorIcon isActive={false} />
        </div>
        <span>{t('curator')}</span>
      </div>
      
      <div className="nav-item">
        <div className="nav-icon">
          <MessageIcon isActive={false} />
        </div>
        <span>{t('message')}</span>
      </div>
      
      <Link href="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className="nav-icon">
          <ProfileIcon isActive={isActive('/profile')} />
        </div>
        <span>{t('profile')}</span>
      </Link>
    </div>
  );
};
