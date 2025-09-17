"use client";

import React, { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, openLoginPage } = useAuthContext();

  useEffect(() => {
    // 백그라운드 로그인 체크가 완료되고 인증되지 않은 경우에만 로그인 페이지로 이동
    if (!isLoading && !isAuthenticated) {
      console.log('AuthGuard: 백그라운드 로그인 체크 완료, 인증되지 않음 - 로그인 페이지로 이동');
      openLoginPage();
    }
  }, [isLoading, isAuthenticated, openLoginPage]);

  // 백그라운드 로그인 체크 중이면 페이지 표시 (대기)
  if (isLoading) {
    return <>{children}</>;
  }

  // 백그라운드 로그인 체크가 완료되었지만 인증되지 않은 경우 반투명하게 표시
  if (!isAuthenticated) {
    return (
      <div className="auth-guard-blurred">
        {children}
      </div>
    );
  }

  // 백그라운드 로그인 체크 완료 + 인증됨 → 페이지 표시
  return <>{children}</>;
};
