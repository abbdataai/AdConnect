import type { BootstrapResponse } from "./types";

export type Step = "connecting" | "form" | "ad" | "connected" | "renew";

export type State = {
  step: Step;
  bootstrap: BootstrapResponse | null;
  sessionId: string | null;
  firstName: string | null;
  expiresAt: string | null;
  adSeconds: number;
  bootstrapError: string | null;
};

export type Action =
  | { type: "BOOTSTRAP_LOADED"; payload: BootstrapResponse }
  | { type: "BOOTSTRAP_FAILED"; payload: { message: string } }
  | { type: "CONNECTING_DONE" }
  | {
      type: "FORM_SUBMITTED";
      payload: { sessionId: string; firstName: string; adSeconds: number };
    }
  | { type: "AD_COMPLETED"; payload: { expiresAt: string } }
  | { type: "TIMER_EXPIRED" }
  | { type: "RENEW_REQUESTED"; payload: { adSeconds: number } };

export const initialState: State = {
  step: "connecting",
  bootstrap: null,
  sessionId: null,
  firstName: null,
  expiresAt: null,
  adSeconds: 30,
  bootstrapError: null,
};

const assertNever = (x: never): never => {
  throw new Error(`Unhandled action: ${JSON.stringify(x)}`);
};

export function machine(state: State, action: Action): State {
  switch (action.type) {
    case "BOOTSTRAP_LOADED":
      return {
        ...state,
        bootstrap: action.payload,
        adSeconds: action.payload.active_campaign.ad_seconds,
        bootstrapError: null,
      };
    case "BOOTSTRAP_FAILED":
      return { ...state, bootstrapError: action.payload.message };
    case "CONNECTING_DONE":
      return { ...state, step: "form" };
    case "FORM_SUBMITTED":
      return {
        ...state,
        step: "ad",
        sessionId: action.payload.sessionId,
        firstName: action.payload.firstName,
        adSeconds: action.payload.adSeconds,
      };
    case "AD_COMPLETED":
      return {
        ...state,
        step: "connected",
        expiresAt: action.payload.expiresAt,
      };
    case "TIMER_EXPIRED":
      return { ...state, step: "renew" };
    case "RENEW_REQUESTED":
      return { ...state, step: "ad", adSeconds: action.payload.adSeconds };
    default:
      return assertNever(action);
  }
}
