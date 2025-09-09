import { Suspense } from "react";
import { TermsAgreement } from "./TermsAgreement";

export default function TermsPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <TermsAgreement />
    </Suspense>
  );
}