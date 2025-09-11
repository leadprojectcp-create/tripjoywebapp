import { Suspense } from "react";
import { EmailSignup } from "./EmailSignup";

export default function EmailPage() {
  return (
    <Suspense fallback={<div></div>}>
      <EmailSignup />
    </Suspense>
  );
}
