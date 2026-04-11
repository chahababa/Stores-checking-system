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
      className="rounded-full bg-white/80 px-4 py-2 text-xs text-ink/75 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "登出中..." : "登出"}
    </button>
  );
}
