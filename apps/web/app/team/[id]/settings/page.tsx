"use client";

import { useParams } from "next/navigation";
import { TeamSettings } from "@/components/features/team/team-settings";

export default function TeamSettingsPage() {
  const params = useParams();
  const teamId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!teamId) {
    return <div>チームIDが見つかりません</div>;
  }

  return <TeamSettings teamId={parseInt(teamId)} />;
}