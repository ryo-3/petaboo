"use client";

import { useParams } from "next/navigation";
import { TeamSettings } from "@/components/features/team/team-settings";

export default function TeamSettingsPage() {
  const params = useParams();
  const customUrl = Array.isArray(params.customUrl) ? params.customUrl[0] : params.customUrl;

  if (!customUrl) {
    return <div>チームURLが見つかりません</div>;
  }

  return <TeamSettings customUrl={customUrl} />;
}