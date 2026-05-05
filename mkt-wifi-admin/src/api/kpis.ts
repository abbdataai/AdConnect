import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { Kpis, WeeklyPoint, Demographics } from "../types/api";

export function useKpis() {
  return useQuery({
    queryKey: ["kpis"],
    queryFn: () => client.get<Kpis>("/api/kpis"),
    staleTime: STALE.kpis,
  });
}

export function useWeeklyConnections() {
  return useQuery({
    queryKey: ["connections", "weekly"],
    queryFn: () => client.get<WeeklyPoint[]>("/api/connections/weekly"),
    staleTime: STALE.weekly,
  });
}

export function useDemographics() {
  return useQuery({
    queryKey: ["demographics"],
    queryFn: () => client.get<Demographics>("/api/demographics"),
    staleTime: STALE.demographics,
  });
}
