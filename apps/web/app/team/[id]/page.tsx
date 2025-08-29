"use client";

import { useParams } from "next/navigation";
import { TeamDetail } from "@/components/features/team/team-detail";

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!teamId) {
    return <div>チームIDが見つかりません</div>;
  }

  return <TeamDetail teamId={parseInt(teamId)} />;
}