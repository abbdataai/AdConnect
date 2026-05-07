import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { Device } from "../types/api";

const KEY = ["devices"] as const;

export function useDevices() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => client.get<Device[]>("/api/devices"),
    staleTime: STALE.devices,
  });
}

export function useRefreshDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.post<Partial<Device>>(`/api/devices/${id}/refresh`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
