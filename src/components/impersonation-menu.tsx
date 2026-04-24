"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { startImpersonateAction, stopImpersonateAction } from "@/app/actions/impersonation";

type StoreOption = { id: string; name: string };

export function ImpersonationMenu({ stores }: { stores: StoreOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  function pick(role: "manager" | "leader", storeId?: string) {
    setOpen(false);
    const fd = new FormData();
    fd.set("role", role);
    if (storeId) fd.set("storeId", storeId);
    startTransition(() => {
      void startImpersonateAction(fd);
    });
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-nb-yellow border-[2.5px] border-nb-ink shadow-nb-sm text-[12px] font-bold text-nb-ink transition-all duration-100 hover:-translate-y-0.5 hover:shadow-nb active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        模擬視角 ▾
      </button>
      {open ? (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-nb-paper border-[2.5px] border-nb-ink shadow-nb p-1.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => pick("manager")}
            className="text-left px-3 py-2 text-sm font-bold text-nb-ink hover:bg-nb-bg2 border-[2px] border-transparent hover:border-nb-ink transition-colors"
          >
            👔 主管視角
          </button>
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => pick("leader", store.id)}
              className="text-left px-3 py-2 text-sm font-bold text-nb-ink hover:bg-nb-bg2 border-[2px] border-transparent hover:border-nb-ink transition-colors"
            >
              🏪 店長 @ {store.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StopImpersonateButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void stopImpersonateAction();
        })
      }
      className="inline-flex items-center px-3 py-1 bg-nb-paper border-[2.5px] border-nb-ink text-[12px] font-bold text-nb-ink transition-all duration-100 hover:-translate-y-0.5 hover:shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      結束模擬
    </button>
  );
}
