'use client';

import React from 'react';
import { Sidebar } from "../components/Sidebar";
import { AppBar } from "../components/AppBar";
import { RightSidebar } from "../components/RightSidebar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from '../contexts/TranslationContext';
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { AuthGuard } from "../components/AuthGuard";
import { SignupFlow } from "../auth/signup/SignupFlow";
import './style.css';

export default function TripTourPage() {
  const { 
    showSignupModal,
    closeSignupModal
  } = useAuthContext();
  
  const { t } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();

  const handleSignupComplete = (userData: any) => {
    console.log('회원가입 완료:', userData);
    closeSignupModal();
  };

  return (
    <>
      <AuthGuard>
        <div className="trip-tour-container">
          {/* Top AppBar */}
          <AppBar 
            showBackButton={false}
            showLogo={true}
            showLanguageSelector={true}
          />
          
          {/* Body Content */}
          <div className="body-content">
            {/* Left Sidebar */}
            <Sidebar unreadMessageCount={unreadMessageCount} />

            {/* Main Content */}
            <div className="main-content">
              <div className="trip-tour-content">
                <div className="preparing-section">
                  <div className="preparing-icon">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h1 className="preparing-title">트립투어</h1>
                  <p className="preparing-message">현재 준비 중입니다</p>
                  <p className="preparing-subtitle">더 나은 서비스를 위해 준비하고 있어요!</p>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <RightSidebar />
          </div>
        </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
      </AuthGuard>
      
      <SignupFlow 
        isOpen={showSignupModal} 
        onClose={closeSignupModal} 
        onSignupComplete={handleSignupComplete}
        initialMethod="email"
      />
    </>
  );
}
