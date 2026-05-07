import { NavLink } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { useCampaigns } from "../api/campaigns";
import { useDevices } from "../api/devices";
import { STR } from "../strings";
import type { Role } from "../types/api";

type Item = { to: string; label: string; allow: Role[]; section: "principal" | "operacao" | "configuracao"; badge?: number; warn?: boolean };

function useNavItems(): Item[] {
  const campaigns = useCampaigns().data;
  const devices = useDevices().data;
  const onlineCount = devices?.filter((d) => d.status === "online").length;
  const offlineCount = devices?.filter((d) => d.status === "offline").length ?? 0;
  return [
    { to: "/", label: STR.nav.dashboard, allow: ["admin", "advertiser", "viewer"], section: "principal" },
    { to: "/campanhas", label: STR.nav.campanhas, allow: ["admin", "advertiser", "viewer"], section: "principal", badge: campaigns?.filter((c) => c.status === "active").length },
    { to: "/usuarios", label: STR.nav.usuarios, allow: ["admin", "viewer"], section: "principal" },
    { to: "/wifi", label: STR.nav.wifi, allow: ["admin", "viewer"], section: "operacao", badge: onlineCount, warn: offlineCount > 0 },
    { to: "/conexoes", label: STR.nav.conexoes, allow: ["admin", "viewer"], section: "operacao" },
    { to: "/notificacoes", label: STR.nav.notificacoes, allow: ["admin", "viewer"], section: "operacao" },
    { to: "/relatorios", label: STR.nav.relatorios, allow: ["admin", "advertiser", "viewer"], section: "configuracao" },
    { to: "/monetizacao", label: STR.nav.monetizacao, allow: ["admin"], section: "configuracao" },
    { to: "/configuracoes", label: STR.nav.configuracoes, allow: ["admin"], section: "configuracao" },
  ];
}

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const items = useNavItems();
  if (!role) return null;
  const visible = items.filter((it) => it.allow.includes(role));
  const groups: Array<{ id: "principal" | "operacao" | "configuracao"; label: string }> = [
    { id: "principal", label: STR.nav.section.principal },
    { id: "operacao", label: STR.nav.section.operacao },
    { id: "configuracao", label: STR.nav.section.configuracao },
  ];
  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <div className="sidebar__brand">{STR.app.title}</div>
      {groups.map((g) => {
        const sectionItems = visible.filter((i) => i.section === g.id);
        if (sectionItems.length === 0) return null;
        return (
          <div key={g.id} className="sidebar__group">
            <div className="sidebar__group-label">{g.label}</div>
            {sectionItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}
                data-testid={`nav-${it.to.replace("/", "") || "dashboard"}`}
              >
                <span>{it.label}</span>
                {it.badge !== undefined && (
                  <span className={`sidebar__badge${it.warn ? " sidebar__badge--warn" : ""}`}>{it.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
