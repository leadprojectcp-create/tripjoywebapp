"use client";

import React from "react";
import { UnifiedSignupFlow } from "../components/UnifiedSignupFlow";
import { SignupMethod } from "./types";
import "./page.css";

export default function SignupPage(): React.JSX.Element {
  // URL 파라미터에서 method, uid, mode 확인
  const [method, setMethod] = React.useState<SignupMethod>('email');
  const [uid, setUid] = React.useState<string>('');
  const [mode, setMode] = React.useState<'signup' | 'complete'>('signup');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const methodParam = urlParams.get('method') as SignupMethod;
      const uidParam = urlParams.get('uid');
      const modeParam = urlParams.get('mode') as 'signup' | 'complete';
      
      console.log('🔍 URL 파라미터 확인:', { method: methodParam, uid: uidParam, mode: modeParam });
      
      if (methodParam) {
        setMethod(methodParam);
      }
      if (uidParam) {
        setUid(uidParam);
      }
      if (modeParam === 'complete') {
        setMode('complete');
      }
    }
  }, []);

  return (
    <UnifiedSignupFlow
      method={method}
      uid={uid}
      mode={mode}
    />
  );
}
