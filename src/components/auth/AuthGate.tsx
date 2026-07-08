"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

/** Wrap protected page content; redirects to /login when signed out. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=protected");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <span className="text-sm text-mist-2">Loading your account…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <span className="text-sm text-mist-2">Redirecting to login…</span>
      </div>
    );
  }

  return <>{children}</>;
}
