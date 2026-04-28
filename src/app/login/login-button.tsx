"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error("無法啟動 Google 登入流程，系統沒有取得跳轉網址。");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Google sign-in failed", error);
      setErrorMessage(error instanceof Error ? error.message : "無法啟動 Google 登入流程。");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="nb-btn-primary w-full justify-center border-[2.5px] border-nb-ink px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-80"
        type="button"
      >
        {loading ? "跳轉中..." : "使用 Google 帳號登入 →"}
      </button>
      {errorMessage ? (
        <p className="border-[2px] border-nb-ink bg-nb-red px-3 py-2 text-sm font-bold text-white">{errorMessage}</p>
      ) : null}
    </div>
  );
}
