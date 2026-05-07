import { describe, expect, it } from "vitest";
import {
  type Action, type State, initialState, machine,
} from "../../src/state/machine";
import type { BootstrapResponse } from "../../src/state/types";

const sampleBootstrap: BootstrapResponse = {
  venue: {
    id: "v1",
    name: "Praça Central",
    pill_label: "PRAÇA CENTRAL · WI-FI GRATUITO",
    organization: { id: "o1", slug: "acme" },
    branding: { logo_url: "/x.svg", primary_color: "#0A84FF", secondary_color: "#5AC8FA" },
    legal_terms_url: "/terms",
    legal_privacy_url: "/privacy",
  },
  active_campaign: {
    id: "c1",
    advertiser_name: "Café Imperial",
    advertiser_slogan: "O sabor que conquista",
    video_url: null,
    source: "Upload",
    ad_seconds: 30,
  },
  form_config: {
    fields: [],
    consent_text: "consent",
    consent_text_version: "v1",
  },
};

describe("machine reducer", () => {
  it("starts at connecting step", () => {
    expect(initialState.step).toBe("connecting");
  });

  it("BOOTSTRAP_LOADED stores payload and adopts ad_seconds", () => {
    const s = machine(initialState, {
      type: "BOOTSTRAP_LOADED", payload: sampleBootstrap,
    });
    expect(s.bootstrap).toBe(sampleBootstrap);
    expect(s.adSeconds).toBe(30);
    expect(s.bootstrapError).toBeNull();
  });

  it("BOOTSTRAP_FAILED records error message", () => {
    const s = machine(initialState, {
      type: "BOOTSTRAP_FAILED", payload: { message: "boom" },
    });
    expect(s.bootstrapError).toBe("boom");
  });

  it("CONNECTING_DONE → form", () => {
    const s = machine(initialState, { type: "CONNECTING_DONE" });
    expect(s.step).toBe("form");
  });

  it("FORM_SUBMITTED → ad with session details", () => {
    const before: State = { ...initialState, step: "form" };
    const s = machine(before, {
      type: "FORM_SUBMITTED",
      payload: { sessionId: "sid", firstName: "Maria", adSeconds: 30 },
    });
    expect(s.step).toBe("ad");
    expect(s.sessionId).toBe("sid");
    expect(s.firstName).toBe("Maria");
    expect(s.adSeconds).toBe(30);
  });

  it("AD_COMPLETED → connected with expiresAt", () => {
    const before: State = { ...initialState, step: "ad" };
    const s = machine(before, {
      type: "AD_COMPLETED",
      payload: { expiresAt: "2026-05-03T12:00:00Z" },
    });
    expect(s.step).toBe("connected");
    expect(s.expiresAt).toBe("2026-05-03T12:00:00Z");
  });

  it("TIMER_EXPIRED → renew", () => {
    const before: State = { ...initialState, step: "connected" };
    const s = machine(before, { type: "TIMER_EXPIRED" });
    expect(s.step).toBe("renew");
  });

  it("RENEW_REQUESTED loops back to ad with adSeconds=60", () => {
    const before: State = { ...initialState, step: "renew" };
    const s = machine(before, {
      type: "RENEW_REQUESTED", payload: { adSeconds: 60 },
    });
    expect(s.step).toBe("ad");
    expect(s.adSeconds).toBe(60);
  });

  it("unknown action throws (assertNever)", () => {
    expect(() =>
      machine(initialState, { type: "BOGUS" } as unknown as Action),
    ).toThrow();
  });
});
