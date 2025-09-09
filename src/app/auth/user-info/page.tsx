import { Suspense } from "react";
import { UserInfoForm } from "./UserInfoForm";

export default function UserInfoPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <UserInfoForm />
    </Suspense>
  );
}