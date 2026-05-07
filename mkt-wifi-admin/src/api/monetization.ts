import { useQuery } from "@tanstack/react-query";
import { client } from "./client";
import { STALE } from "./staleTimes";
import type { MonetizationPlan } from "../types/api";

export function useMonetizationPlans() {
  return useQuery({
    queryKey: ["monetization"],
    queryFn: () => client.get<MonetizationPlan[]>("/api/monetization"),
    staleTime: STALE.monetization,
  });
}
