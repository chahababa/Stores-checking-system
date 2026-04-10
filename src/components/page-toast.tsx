"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("success");
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;

    router.replace(nextUrl, { scroll: false });

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700 shadow-lg">
      {message}
    </div>
  );
}
