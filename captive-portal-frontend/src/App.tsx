import { lazy, Suspense, useEffect, useReducer } from "react";
import { initialState, machine } from "./state/machine";
import { getBootstrap } from "./state/api";
import { ConnectingScreen } from "./screens/ConnectingScreen";
import { ConnectedScreen } from "./screens/ConnectedScreen";
import { FormScreen } from "./screens/FormScreen";
import { RenewScreen } from "./screens/RenewScreen";
import { STR } from "./strings";
import type { PortalQuery } from "./state/types";

const AdScreen = lazy(() => import("./screens/AdScreen"));

type Props = { query: PortalQuery };

export function App({ query }: Props) {
  const [state, dispatch] = useReducer(machine, initialState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bootstrap = await getBootstrap(query);
        if (!cancelled) dispatch({ type: "BOOTSTRAP_LOADED", payload: bootstrap });
      } catch (e) {
        if (!cancelled) {
          dispatch({
            type: "BOOTSTRAP_FAILED",
            payload: { message: STR.errors.bootstrapFailed },
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  useEffect(() => {
    if (!state.bootstrap) return;
    const root = document.documentElement;
    root.style.setProperty("--accent", state.bootstrap.venue.branding.primary_color);
    root.style.setProperty("--accent-2", state.bootstrap.venue.branding.secondary_color);
  }, [state.bootstrap]);

  if (state.bootstrapError) {
    return (
      <main className="screen">
        <div className="error-banner" role="alert">
          {state.bootstrapError}
        </div>
      </main>
    );
  }

  if (state.step === "connecting" || !state.bootstrap) {
    const ssid = state.bootstrap
      ? `MKT_WiFi_${state.bootstrap.venue.name.replace(/\s+/g, "_")}`
      : "MKT_WiFi_Praca_Central";
    return <ConnectingScreen ssid={ssid} onComplete={() => dispatch({ type: "CONNECTING_DONE" })} />;
  }

  if (state.step === "form") {
    return (
      <FormScreen
        bootstrap={state.bootstrap}
        query={query}
        onSubmitted={(sessionId, firstName, adSeconds) =>
          dispatch({
            type: "FORM_SUBMITTED",
            payload: { sessionId, firstName, adSeconds },
          })
        }
      />
    );
  }

  if (state.step === "ad") {
    if (!state.sessionId) return null;
    return (
      <Suspense fallback={<main className="screen" />}>
        <AdScreen
          campaign={state.bootstrap.active_campaign}
          sessionId={state.sessionId}
          adSeconds={state.adSeconds}
          onComplete={(expiresAt) =>
            dispatch({ type: "AD_COMPLETED", payload: { expiresAt } })
          }
        />
      </Suspense>
    );
  }

  if (state.step === "connected") {
    if (!state.expiresAt || !state.firstName) return null;
    return (
      <ConnectedScreen
        firstName={state.firstName}
        expiresAt={state.expiresAt}
        onExpired={() => dispatch({ type: "TIMER_EXPIRED" })}
      />
    );
  }

  if (state.step === "renew") {
    if (!state.sessionId) return null;
    return (
      <RenewScreen
        sessionId={state.sessionId}
        onRenew={(adSeconds) =>
          dispatch({ type: "RENEW_REQUESTED", payload: { adSeconds } })
        }
      />
    );
  }

  return null;
}
