import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "owner") {
    redirect("/inspection/history");
  }

  if (profile.role === "manager") {
    redirect("/inspection/new");
  }

  redirect("/pending");
}
