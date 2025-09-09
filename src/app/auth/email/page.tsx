import { Suspense } from "react";
import { EmailSignup } from "./EmailSignup";

export default function EmailPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <EmailSignup />
    </Suspense>
  );
}
