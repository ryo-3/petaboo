"use client";

import TeamSettingsScreen from "@/components/screens/team-settings-screen";
import { PremiumPlanGuard } from "@/components/features/team/premium-plan-guard";

export default function TeamSettingsPage() {
  return (
    <PremiumPlanGuard>
      <TeamSettingsScreen teamId={1} />
    </PremiumPlanGuard>
  );
}