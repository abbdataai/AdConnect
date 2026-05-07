import { describe, expect, it } from "vitest";
import { formatMmSs, formatTemplate, getFirstName } from "../../src/ui/format";

describe("getFirstName", () => {
  // AT-012 unit-level: only the first whitespace-delimited token is the first name.
  it("extracts first token from a multi-word name", () => {
    expect(getFirstName("João Pedro Silva Souza")).toBe("João");
  });

  it("handles single-word name", () => {
    expect(getFirstName("Maria")).toBe("Maria");
  });

  it("trims surrounding whitespace before splitting", () => {
    expect(getFirstName("   Ana Beatriz   ")).toBe("Ana");
  });

  it("collapses repeated internal whitespace", () => {
    expect(getFirstName("Carlos    Eduardo")).toBe("Carlos");
  });

  it("returns empty string for empty input", () => {
    expect(getFirstName("")).toBe("");
    expect(getFirstName("   ")).toBe("");
  });
});

describe("formatTemplate", () => {
  it("substitutes named variables", () => {
    expect(
      formatTemplate("Aproveite, {firstName}!", { firstName: "Maria" }),
    ).toBe("Aproveite, Maria!");
  });

  it("supports multiple variables", () => {
    expect(
      formatTemplate("MKT_WiFi_{venue} ({ssid})", {
        venue: "Praca", ssid: "open",
      }),
    ).toBe("MKT_WiFi_Praca (open)");
  });

  it("leaves unknown placeholders intact", () => {
    expect(formatTemplate("Hello {missing}", { foo: "bar" })).toBe("Hello {missing}");
  });
});

describe("formatMmSs", () => {
  it("formats 1800 seconds as 30:00", () => {
    expect(formatMmSs(1800)).toBe("30:00");
  });

  it("pads single digits", () => {
    expect(formatMmSs(65)).toBe("01:05");
  });

  it("clamps negative input to 00:00", () => {
    expect(formatMmSs(-5)).toBe("00:00");
  });
});
