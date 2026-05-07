import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { Report } from "../types/api";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => client.get<Report[]>("/api/reports"),
    staleTime: STALE.reports,
  });
}
