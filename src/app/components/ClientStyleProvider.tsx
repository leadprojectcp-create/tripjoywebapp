"use client";

import { useEffect, useState } from 'react';

interface ClientStyleProviderProps {
  children: React.ReactNode;
}

/**
 * CSS 하이드레이션 불일치 문제를 해결하기 위한 클라이언트 스타일 프로바이더
 * 클라이언트에서만 특정 스타일을 적용하여 SSR/CSR 간 차이를 방지
 */
export default function ClientStyleProvider({ children }: ClientStyleProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    setIsClient(true);
  }, []);

  if (!isClient) {
    // 서버 사이드에서는 기본 스타일만 적용
    return <div suppressHydrationWarning>{children}</div>;
  }

  // 클라이언트 사이드에서는 완전한 스타일 적용
  return <>{children}</>;
}
