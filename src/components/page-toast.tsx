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
    <div className="fixed right-4 top-4 z-50 bg-nb-green border-[2.5px] border-nb-ink shadow-nb px-4 py-3 text-sm font-bold text-nb-ink">
      <span className="nb-eyebrow mr-2 text-nb-ink/70">OK</span>
      {message}
    </div>
  );
}
