import { StopImpersonateButton } from "@/components/impersonation-menu";
import { getRoleLabel } from "@/lib/ui-labels";
import type { UserRole } from "@/lib/auth";

export function ImpersonationBanner({
  role,
  storeName,
}: {
  role: UserRole;
  storeName: string | null;
}) {
  const label = role === "leader" && storeName ? `店長 · ${storeName}` : getRoleLabel(role);
  return (
    <div className="sticky top-0 z-40 bg-nb-red text-white border-b-[3px] border-nb-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm font-bold">
        <span>🔄 正在模擬【{label}】視角</span>
        <StopImpersonateButton />
      </div>
    </div>
  );
}
