import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import { STR } from "../strings";
import { getInitials } from "../utils/format";

export function UserDropdown() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const role = STR.roles[user.role];
  const onLogout = () => {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="user">
      <button
        type="button"
        className="user__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="user__avatar">{getInitials(user.name)}</span>
        <span className="user__meta">
          <span className="user__name">{user.name}</span>
          <span className="user__role">{role}</span>
        </span>
      </button>
      {open && (
        <div className="user__menu" role="menu">
          <button type="button" className="user__menu-item" role="menuitem" onClick={() => setOpen(false)}>
            {STR.topbar.meuPerfil}
          </button>
          <button type="button" className="user__menu-item" role="menuitem" onClick={onLogout} data-testid="logout">
            {STR.topbar.sair}
          </button>
        </div>
      )}
    </div>
  );
}
