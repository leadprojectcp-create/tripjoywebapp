"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslationContext } from "../contexts/TranslationContext";
import "./AppBar.css";

interface AppBarProps {
  title?: string;
  showBackButton?: boolean;
  showLanguageSelector?: boolean;
  showLogo?: boolean;
}

export const AppBar = ({ 
  title = "TRIPJOY", 
  showBackButton = false, 
  showLanguageSelector = true,
  showLogo = true
}: AppBarProps): React.JSX.Element => {
  const router = useRouter();
  const { currentLanguage, changeLanguage } = useTranslationContext();

  const handleBackClick = () => {
    router.back();
  };

  const handleLogoClick = () => {
    router.push('/');
  };

  return (
    <div className="app-bar">
      <div className="app-bar-left">
        {showBackButton && (
          <button className="back-button" onClick={handleBackClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {showLogo && (
          <div className="logo-container" onClick={handleLogoClick}>
            <Image 
              src="/logo.png" 
              alt="TRIPJOY Logo" 
              width={100} 
              height={32} 
              priority
              className="logo-image"
            />
          </div>
        )}
      </div>

      <div className="app-bar-right">
        {showLanguageSelector && (
          <LanguageSelector 
            currentLanguage={currentLanguage} 
            onLanguageChange={changeLanguage}
            dropdownDirection="down"
          />
        )}
      </div>
    </div>
  );
};
