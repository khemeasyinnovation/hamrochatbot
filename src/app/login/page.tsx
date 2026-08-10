"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/chat/AuthForm";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      <AuthForm onAuthed={() => router.push("/dashboard")} />
    </div>
  );
}