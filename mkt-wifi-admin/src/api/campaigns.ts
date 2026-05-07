import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { Campaign, CampaignCreate, CampaignStatus, CampaignUpdate } from "../types/api";

const KEY = ["campaigns"] as const;

export function useCampaigns(filters: { status?: CampaignStatus; limit?: number } = {}) {
  return useQuery({
    queryKey: [...KEY, filters] as const,
    queryFn: async () => {
      const all = await client.get<Campaign[]>("/api/campaigns");
      let result = all;
      if (filters.status) result = result.filter((c) => c.status === filters.status);
      if (filters.limit) result = result.slice(0, filters.limit);
      return result;
    },
    staleTime: STALE.campaigns,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignCreate) => client.post<Campaign>("/api/campaigns", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CampaignUpdate }) =>
      client.patch<Campaign>(`/api/campaigns/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
