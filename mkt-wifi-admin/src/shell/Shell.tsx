import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ToastContainer } from "../ui/ToastContainer";
import { usePrefsStore } from "../stores/prefs";

export function Shell() {
  const { pathname, search } = useLocation();
  const setLastVisitedRoute = usePrefsStore((s) => s.setLastVisitedRoute);

  useEffect(() => {
    setLastVisitedRoute(pathname + search);
  }, [pathname, search, setLastVisitedRoute]);

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__main">
        <Topbar />
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
