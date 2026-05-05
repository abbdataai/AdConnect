import { describe, expect, it } from "vitest";
import {
  formatBRL,
  formatPercent,
  getInitials,
  formatRelative,
  formatDelta,
} from "../../../src/utils/format";

describe("formatBRL", () => {
  it("formats integers with R$", () => {
    expect(formatBRL(2340)).toMatch(/R\$\s?2\.340/);
  });
});

describe("formatPercent", () => {
  it("formats with no fraction by default", () => {
    expect(formatPercent(78)).toBe("78%");
  });
});

describe("getInitials", () => {
  it("returns first + last initial for multi-word names", () => {
    expect(getInitials("Maria Silva")).toBe("MS");
    expect(getInitials("Joao Pedro Silva")).toBe("JS");
  });
  it("uppercases first 2 chars for single-word names", () => {
    expect(getInitials("Maria")).toBe("MA");
  });
  it("returns ?? on empty input", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials("   ")).toBe("??");
  });
});

describe("formatRelative", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatRelative(1800)).toBe("30:00");
    expect(formatRelative(65)).toBe("01:05");
    expect(formatRelative(-5)).toBe("00:00");
  });
});

describe("formatDelta", () => {
  it("adds + sign for positive deltas", () => {
    expect(formatDelta(18)).toBe("+18%");
    expect(formatDelta(2, "abs")).toBe("+2");
  });
  it("retains minus for negative deltas", () => {
    expect(formatDelta(-3)).toBe("-3%");
  });
});
