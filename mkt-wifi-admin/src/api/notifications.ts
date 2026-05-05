import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { NotifGroup, NotifRule } from "../types/api";

const RULES_KEY = ["notifications", "rules"] as const;
const GROUPS_KEY = ["notifications", "groups"] as const;

export function useNotifRules() {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: () => client.get<NotifRule[]>("/api/notifications/rules"),
    staleTime: STALE.notifRules,
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      client.patch<{ ok: true }>(`/api/notifications/rules/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export function useNotifGroups() {
  return useQuery({
    queryKey: GROUPS_KEY,
    queryFn: () => client.get<NotifGroup[]>("/api/notifications/groups"),
    staleTime: STALE.notifGroups,
  });
}
