// Per-endpoint TanStack Query staleTime (Decision 7).

export const STALE = {
  kpis: 30_000,
  weekly: 60_000,
  demographics: 60_000,
  campaigns: 30_000,
  users: 30_000,
  liveUsers: 0,
  devices: 15_000,
  notifRules: 60_000,
  notifGroups: Infinity,
  monetization: Infinity,
  reports: 30_000,
} as const;

export const REFETCH = {
  liveUsers: 5_000,
} as const;
