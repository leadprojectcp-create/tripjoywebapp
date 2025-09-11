import { Suspense } from "react";
import { TermsAgreement } from "./TermsAgreement";

export default function TermsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <TermsAgreement />
    </Suspense>
  );
}