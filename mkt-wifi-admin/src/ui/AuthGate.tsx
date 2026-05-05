import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

type Props = { children: React.ReactNode };

export function AuthGate({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const isExpired = useAuthStore((s) => s.isExpired);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  useEffect(() => {
    if (user && isExpired()) logout();
  }, [user, isExpired, logout]);

  if (!user) {
    const next = location.pathname + location.search;
    const search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return <Navigate to={`/login${search}`} replace />;
  }
  return <>{children}</>;
}
