import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { STALE, REFETCH } from "./staleTimes";
import type { Lead, LiveUser } from "../types/api";

export function useUsers(filters: { zone?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ["users", filters] as const,
    queryFn: () => client.get<Lead[]>("/api/users", filters),
    staleTime: STALE.users,
  });
}

export function useLiveUsers(filters: { limit?: number } = {}) {
  return useQuery({
    queryKey: ["users", "live", filters] as const,
    queryFn: async () => {
      const all = await client.get<LiveUser[]>("/api/users/live");
      return filters.limit ? all.slice(0, filters.limit) : all;
    },
    staleTime: STALE.liveUsers,
    refetchInterval: REFETCH.liveUsers,
  });
}
