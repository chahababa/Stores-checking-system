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
        throw new Error("Unable to start Google sign-in. No redirect URL was returned.");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Google sign-in failed", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded-full bg-warm px-6 py-3 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-80"
        type="button"
      >
        {loading ? "Redirecting..." : "Sign in with Google"}
      </button>
      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
