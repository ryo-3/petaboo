"use client";

import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard";
import { TeamWelcome } from "@/components/features/team/team-welcome";

export default function TeamPage() {
  return (
    <PremiumPlanGuard>
      <TeamWelcome />
    </PremiumPlanGuard>
  );
}