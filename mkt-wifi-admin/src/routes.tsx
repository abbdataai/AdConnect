import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell } from "./shell/Shell";
import { LoginPage } from "./sections/login/LoginPage";
import { ForbiddenPage } from "./sections/_403/ForbiddenPage";
import { AuthGate } from "./ui/AuthGate";
import { RoleGuard } from "./ui/RoleGuard";
import { DashboardPage } from "./sections/dashboard/DashboardPage";
import { CampanhasPage } from "./sections/campanhas/CampanhasPage";
import { UsuariosPage } from "./sections/usuarios/UsuariosPage";
import { WifiPage } from "./sections/wifi/WifiPage";
import { ConexoesPage } from "./sections/conexoes/ConexoesPage";
import { NotificacoesPage } from "./sections/notificacoes/NotificacoesPage";

const RelatoriosPage = lazy(() => import("./sections/relatorios/RelatoriosPage"));
const MonetizacaoPage = lazy(() => import("./sections/monetizacao/MonetizacaoPage"));
const ConfiguracoesPage = lazy(() => import("./sections/configuracoes/ConfiguracoesPage"));

const lazyFallback = <div className="screen" />;

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AuthGate><Shell /></AuthGate>,
    children: [
      { index: true, element: <RoleGuard allow={["admin", "advertiser", "viewer"]}><DashboardPage /></RoleGuard> },
      { path: "campanhas", element: <RoleGuard allow={["admin", "advertiser", "viewer"]}><CampanhasPage /></RoleGuard> },
      { path: "usuarios", element: <RoleGuard allow={["admin", "viewer"]}><UsuariosPage /></RoleGuard> },
      { path: "wifi", element: <RoleGuard allow={["admin", "viewer"]}><WifiPage /></RoleGuard> },
      { path: "conexoes", element: <RoleGuard allow={["admin", "viewer"]}><ConexoesPage /></RoleGuard> },
      { path: "notificacoes", element: <RoleGuard allow={["admin", "viewer"]}><NotificacoesPage /></RoleGuard> },
      {
        path: "relatorios",
        element: (
          <RoleGuard allow={["admin", "advertiser", "viewer"]}>
            <Suspense fallback={lazyFallback}><RelatoriosPage /></Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "monetizacao",
        element: (
          <RoleGuard allow="admin">
            <Suspense fallback={lazyFallback}><MonetizacaoPage /></Suspense>
          </RoleGuard>
        ),
      },
      {
        path: "configuracoes",
        element: (
          <RoleGuard allow="admin">
            <Suspense fallback={lazyFallback}><ConfiguracoesPage /></Suspense>
          </RoleGuard>
        ),
      },
      { path: "403", element: <ForbiddenPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
