"use client";

import Main from "../main";
import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard";

export default function TeamPage() {
  return (
    <PremiumPlanGuard>
      <Main teamMode={true} teamId={1} />
    </PremiumPlanGuard>
  );
}