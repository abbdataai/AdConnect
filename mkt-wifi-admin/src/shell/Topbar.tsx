import { useLocation } from "react-router-dom";
import { useLiveUsers } from "../api/users";
import { STR } from "../strings";
import { UserDropdown } from "./UserDropdown";

const TITLES: Record<string, string> = {
  "/": STR.dashboard.title,
  "/campanhas": STR.campanhas.title,
  "/usuarios": STR.usuarios.title,
  "/wifi": STR.wifi.title,
  "/conexoes": STR.conexoes.title,
  "/notificacoes": STR.notificacoes.title,
  "/relatorios": STR.relatorios.title,
  "/monetizacao": STR.monetizacao.title,
  "/configuracoes": STR.configuracoes.title,
};

export function Topbar() {
  const { pathname } = useLocation();
  const live = useLiveUsers().data;
  const title = TITLES[pathname] ?? STR.app.title;
  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__right">
        {live && (
          <span className="topbar__live" data-testid="topbar-live-count">
            {live.length} {STR.topbar.onlineNow}
          </span>
        )}
        <UserDropdown />
      </div>
    </header>
  );
}
