"use client";

import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard";
import { TeamCreate } from "@/components/features/team/team-create";

export default function TeamCreatePage() {
  return (
    <PremiumPlanGuard>
      <TeamCreate />
    </PremiumPlanGuard>
  );
}
