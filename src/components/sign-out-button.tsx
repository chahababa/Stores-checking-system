"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    try {
      setLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch (error) {
      console.error("Sign out failed", error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 bg-nb-paper border-[2.5px] border-nb-ink shadow-nb-sm text-[12px] font-bold text-nb-ink transition-all duration-100 hover:-translate-y-0.5 hover:shadow-nb active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "登出中..." : "登出"}
    </button>
  );
}
