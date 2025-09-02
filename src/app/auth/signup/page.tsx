"use client";

import React from "react";
import { UnifiedSignupFlow } from "../components/UnifiedSignupFlow";
import { SignupMethod } from "./types";
import "./page.css";

export default function SignupPage(): React.JSX.Element {
  // URL 파라미터에서 method와 uid 확인
  const [method, setMethod] = React.useState<SignupMethod>('email');
  const [uid, setUid] = React.useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const methodParam = urlParams.get('method') as SignupMethod;
      const uidParam = urlParams.get('uid');
      
      console.log('🔍 URL 파라미터 확인:', { method: methodParam, uid: uidParam });
      
      if (methodParam) {
        setMethod(methodParam);
      }
      if (uidParam) {
        setUid(uidParam);
      }
    }
  }, []);

  return (
    <UnifiedSignupFlow
      method={method}
      uid={uid}
    />
  );
}
