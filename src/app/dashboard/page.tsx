"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LegacyDashboardRedirectPage() {
  const router = useRouter();
  const { user, loading, needsAuthCode } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (needsAuthCode) {
      router.replace("/auth-code");
      return;
    }

    router.replace("/");
  }, [loading, user, needsAuthCode, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
