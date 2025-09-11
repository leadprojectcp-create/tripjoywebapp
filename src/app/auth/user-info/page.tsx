import { Suspense } from "react";
import { UserInfoForm } from "./UserInfoForm";

export default function UserInfoPage() {
  return (
    <Suspense fallback={<div></div>}>
      <UserInfoForm />
    </Suspense>
  );
}