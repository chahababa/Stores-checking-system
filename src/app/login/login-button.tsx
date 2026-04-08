"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full rounded-full bg-warm px-6 py-3 text-base font-medium text-white transition hover:brightness-105"
      type="button"
    >
      {loading ? "跳轉中..." : "使用 Google 帳號登入"}
    </button>
  );
}
