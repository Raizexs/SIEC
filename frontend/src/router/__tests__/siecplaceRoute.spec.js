import { describe, it, expect } from "vitest";
import { routes } from "../routes.js";

describe("SIEC Place navigation", () => {
  it("registers /siecplace route", () => {
    expect(routes.some((route) => route.path === "/siecplace")).toBe(true);
    expect(routes.some((route) => route.name === "siecplace")).toBe(true);
  });

  it("does not expose legacy analytics dashboard route", () => {
    expect(routes.some((route) => String(route.path).includes("analytics"))).toBe(false);
  });
});
