import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";
import type { Role } from "../types/api";
import { ForbiddenPage } from "../sections/_403/ForbiddenPage";

type Props = {
  allow: Role | Role[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!allowed.includes(role)) return <ForbiddenPage />;
  return <>{children}</>;
}
