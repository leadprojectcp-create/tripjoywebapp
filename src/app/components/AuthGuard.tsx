"use client";

import React, { useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, openLoginPage } = useAuthContext();

  useEffect(() => {
    // 로딩이 완료되고 인증되지 않은 경우 로그인 페이지로 이동
    if (!isLoading && !isAuthenticated) {
      openLoginPage();
    }
  }, [isLoading, isAuthenticated, openLoginPage]);

  // 로딩 중이거나 인증되지 않은 경우에도 dashboard를 반투명하게 표시
  if (isLoading || !isAuthenticated) {
    return (
      <div className="auth-guard-blurred">
        {children}
      </div>
    );
  }

  return <>{children}</>;
};
