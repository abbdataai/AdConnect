// Hand-written TS mirror of the 14 admin endpoints in backend/main.py.
// Drift detected by tests/contract/openapi.test.ts.

export type Role = "admin" | "advertiser" | "viewer";

export type LoginRequest = { email: string; password: string };
export type LoginResponse =
  | { ok: true; token: string; user: { email: string; name: string; role: Role } }
  | { ok: false; message: string };

export type Kpis = {
  reach: number;
  reachDelta: number;
  activeCampaigns: number;
  campaignsDelta: number;
  investment: number;
  investmentDelta: number;
  onlineDevices: number;
};

export type WeeklyPoint = { day: string; value: number };

export type DemographicEntry = { label: string; pct: number; color?: string };
export type Demographics = {
  gender: DemographicEntry[];
  age: DemographicEntry[];
};

export type CampaignStatus = "active" | "paused" | "ended";

export type Campaign = {
  id: string;
  name: string;
  location: string;
  created: string;
  duration: number;
  source: "YouTube" | "Upload";
  views: number;
  completion: number;
  revenue: number;
  status: CampaignStatus;
};

export type CampaignCreate = {
  name: string;
  location: string;
  duration: number;
  source: "YouTube" | "Upload";
};

export type CampaignUpdate = Partial<CampaignCreate> & { status?: CampaignStatus };

// Lead — admin SPA consumes only the LGPD-allowed fields. Backend may still
// return phone/email/last_name for legacy rows; we type them away here so they
// can never be referenced by component code (NFR-005 type-system enforcement).
export type Lead = {
  id: string;
  name: string;
  zone: string;
  age: number;
  gender: string;
  lastConnection: string;
  connections: number;
};

export type LiveUser = {
  id: string;
  name: string;
  initials: string;
  gender: string;
  age: number;
  zone: string;
  remaining: number;
  palette: string[];
};

export type Device = {
  id: string;
  name: string;
  ip: string;
  mac: string;
  cpu: number;
  ram: number;
  users: number;
  up: number;
  down: number;
  status: "online" | "offline";
  lastSeen?: string;
};

export type NotifRule = {
  id: string;
  channel: "WhatsApp" | "Email";
  icon: string;
  title: string;
  desc: string;
  active: boolean;
};

export type NotifGroup = {
  id: string;
  name: string;
  members: number;
  desc: string;
};

export type MonetizationPlan = {
  id: string;
  icon: string;
  name: string;
  desc: string;
};

export type Report = {
  id: string;
  name: string;
  date: string;
  size: string;
  type: "PDF" | "Planilha" | "CSV";
};
