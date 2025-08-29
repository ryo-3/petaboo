import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = "http://localhost:7594";

interface TeamStats {
  ownedTeams: number;
  memberTeams: number;
  maxOwnedTeams: number;
  maxMemberTeams: number;
}

export function useTeamStats() {
  const { getToken } = useAuth();

  return useQuery<TeamStats>({
    queryKey: ["teamStats"],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams/stats`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team stats");
      }

      return response.json();
    },
    enabled: !!getToken,
  });
}