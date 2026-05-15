import { describe, it, expect } from "vitest";
import {
  computePortfolioAnalytics,
  normalizePortfolioItem,
  CONCENTRATION_RATIO,
} from "../usePortfolioAnalytics";

describe("normalizePortfolioItem", () => {
  it("maps API snake_case and local camelCase", () => {
    const a = normalizePortfolioItem(
      {
        id: "u1",
        name: "A",
        m2_totales: 100,
        estimated_cost: 500000,
        material_id: 2,
        shared: true,
        updated_at: "2024-06-01T00:00:00Z",
      },
      0,
    );
    expect(a.m2).toBe(100);
    expect(a.estimatedCost).toBe(500000);
    expect(a.materialId).toBe(2);
    expect(a.shared).toBe(true);

    const b = normalizePortfolioItem(
      {
        nombre: "B",
        m2Totales: 50,
        materialEstructuralId: 1,
        createdAt: "2024-01-01T00:00:00Z",
      },
      1,
    );
    expect(b.name).toBe("B");
    expect(b.m2).toBe(50);
    expect(b.materialId).toBe(1);
    expect(b.shared).toBe(false);
  });
});

describe("computePortfolioAnalytics", () => {
  it("handles empty portfolio", () => {
    const r = computePortfolioAnalytics([], {});
    expect(r.totalProjects).toBe(0);
    expect(r.qualifyingCount).toBe(0);
    expect(r.avgCostPerM2Qualifying).toBe(0);
    expect(r.riskCount).toBe(0);
    expect(r.insights.some((s) => s.includes("Aún no hay"))).toBe(true);
  });

  it("computes avg cost per m² only on qualifying projects", () => {
    const r = computePortfolioAnalytics(
      [
        { name: "Full", m2_totales: 10, estimated_cost: 100000, material_id: 1 },
        { name: "No cost", m2_totales: 10, material_id: 1 },
        { name: "No m2", m2_totales: 0, estimated_cost: 50, material_id: 1 },
      ],
      {},
    );
    expect(r.qualifyingCount).toBe(1);
    expect(r.avgCostPerM2Qualifying).toBe(10000);
  });

  it("breaks dominant material ties by total m²", () => {
    const r = computePortfolioAnalytics(
      [
        { name: "A", m2_totales: 10, material_id: 1, estimated_cost: 1 },
        { name: "B", m2_totales: 10, material_id: 2, estimated_cost: 1 },
        { name: "C", m2_totales: 50, material_id: 2, estimated_cost: 1 },
      ],
      {},
    );
    expect(r.dominantMaterial.id).toBe(2);
    expect(r.dominantMaterial.count).toBe(2);
  });

  it("adds fetch-error risk when hasFetchError", () => {
    const r = computePortfolioAnalytics([], { hasFetchError: true });
    expect(r.risks.some((x) => x.title.includes("Fuente de datos"))).toBe(
      true,
    );
    expect(r.riskCount).toBeGreaterThanOrEqual(1);
  });

  it("flags concentration when one material exceeds ratio", () => {
    const many = [
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `P${i}`,
        m2_totales: 20,
        material_id: 4,
        estimated_cost: 1000,
      })),
      {
        name: "OtherMat",
        m2_totales: 20,
        material_id: 2,
        estimated_cost: 1000,
      },
    ];
    const r = computePortfolioAnalytics(many, {});
    const conc = r.risks.find((x) =>
      x.title.includes("concentración") || x.title.includes("concentrada"),
    );
    expect(
      many.length >= 3 &&
        r.dominantMaterial.count / r.totalProjects >= CONCENTRATION_RATIO,
    ).toBe(true);
    expect(conc).toBeDefined();
  });

  it("detects cost/m² outliers vs median with enough projects", () => {
    const base = [
      { name: "L1", m2_totales: 10, estimated_cost: 100000, material_id: 1 },
      { name: "L2", m2_totales: 10, estimated_cost: 100000, material_id: 1 },
      { name: "L3", m2_totales: 10, estimated_cost: 100000, material_id: 1 },
      {
        name: "High",
        m2_totales: 10,
        estimated_cost: 500000,
        material_id: 1,
      },
    ];
    const r = computePortfolioAnalytics(base, {});
    const out = r.risks.find((x) => x.title.includes("atípico"));
    expect(out).toBeDefined();
    expect(out.projectId).toBeDefined();
  });

  it("sorts top by cost and recent by updatedAt", () => {
    const r = computePortfolioAnalytics(
      [
        {
          id: 1,
          name: "Cheap",
          m2_totales: 1,
          estimated_cost: 100,
          material_id: 1,
          updated_at: "2020-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "Rich",
          m2_totales: 1,
          estimated_cost: 999999,
          material_id: 2,
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
      {},
    );
    expect(r.topByCost[0].name).toBe("Rich");
    expect(r.recentActivity[0].name).toBe("Rich");
  });
});
