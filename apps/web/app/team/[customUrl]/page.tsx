"use client";

import { useParams } from "next/navigation";
import { TeamDetail } from "@/components/features/team/team-detail";

export default function TeamDetailPage() {
  const params = useParams();
  const customUrl = Array.isArray(params.customUrl)
    ? params.customUrl[0]
    : params.customUrl;

  if (!customUrl) {
    return <div>チームURLが見つかりません</div>;
  }

  return <TeamDetail customUrl={customUrl} />;
}
