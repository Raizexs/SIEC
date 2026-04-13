/**
 * tokenMath.spec.js
 * HU11 - Sistema de Validación Espacial por Tokens
 *
 * Test suite for token calculation logic with 10+ critical scenarios:
 * 1. Exact balance validation
 * 2. Overdraft blocking
 * 3. Edge cases (0 m², max m²)
 * 4. Token cost by type calculation
 * 5. Status transitions (safe → warning → danger)
 * 6. Dynamic room costs (simple, double, triple)
 * 7. Add room validation
 * 8. Status description generation
 * 9. Invalid/NaN values
 * 10. MAX_M2 boundary
 * 11. Ratio-based status calculation
 * 12. Complete workflow
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateTokensUsedByType,
  calculateTotalTokensUsed,
  calculateTotalTokens,
  calculateAvailableTokens,
  calculateUsagePercentage,
  getStatusByRatio,
  getStatus,
  generateStatusDescription,
  validateTokensForAddition,
  calculateTokensComplete,
  DEFAULT_COSTS,
  STATUS_THRESHOLDS,
  MAX_M2,
} from "../tokenMath";

describe("HU11: Sistema de Validación Espacial por Tokens", () => {
  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 1: Validación de Saldo Exacto
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 1: Exact Balance Validation", () => {
    it("should calculate exact match when used = available", () => {
      // 50 m² = 5 tokens; 1 habitación (5 tokens) = 0 libres
      const totalTokens = calculateTotalTokens(50);
      const usedTokens = DEFAULT_COSTS.habitacionSimple;
      const available = calculateAvailableTokens(totalTokens, usedTokens);

      expect(totalTokens).toBe(5);
      expect(usedTokens).toBe(5);
      expect(available).toBe(0);
    });

    it("should handle precise m² to token mapping (1 token per 10 m²)", () => {
      expect(calculateTotalTokens(10)).toBe(1);
      expect(calculateTotalTokens(20)).toBe(2);
      expect(calculateTotalTokens(100)).toBe(10);
      expect(calculateTotalTokens(150)).toBe(15);
    });

    it("should floor token calculations (19 m² → 1 token, not 1.9)", () => {
      expect(calculateTotalTokens(19)).toBe(1);
      expect(calculateTotalTokens(29)).toBe(2);
      expect(calculateTotalTokens(99)).toBe(9);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 2: Bloqueo al Intentar Sobregirar Saldo
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 2: Overdraft Blocking", () => {
    it("should block addition when insufficient balance", () => {
      const requiredTokens = 10;
      const availableTokens = 5;

      const result = validateTokensForAddition(requiredTokens, availableTokens);

      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("insuficiente");
    });

    it("should allow addition when balance is exact", () => {
      const requiredTokens = 5;
      const availableTokens = 5;

      const result = validateTokensForAddition(requiredTokens, availableTokens);

      expect(result.canAdd).toBe(true);
    });

    it("should allow addition when balance is surplus", () => {
      const requiredTokens = 5;
      const availableTokens = 10;

      const result = validateTokensForAddition(requiredTokens, availableTokens);

      expect(result.canAdd).toBe(true);
      expect(result.reason).toContain("suficiente");
    });

    it("should transition to danger status when over budget", () => {
      // 30 m² = 3 tokens; 5 habitaciones = 25 tokens (over budget)
      const counts = {
        habitacionesSimples: 5,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 0,
      };

      const totalTokens = calculateTotalTokens(30);
      const usedTokens = calculateTotalTokensUsed(
        calculateTokensUsedByType(counts),
      );
      const status = getStatus(usedTokens, totalTokens);

      expect(totalTokens).toBe(3);
      expect(usedTokens).toBe(25);
      expect(status).toBe("danger");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 3: Casos Límite de Superficie
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 3: Edge Cases - Surface Area", () => {
    it("should handle 0 m² correctly", () => {
      const totalTokens = calculateTotalTokens(0);
      expect(totalTokens).toBe(0);
    });

    it("should handle negative m² by returning 0", () => {
      const totalTokens = calculateTotalTokens(-100);
      expect(totalTokens).toBe(0);
    });

    it("should handle NaN m² by returning 0", () => {
      const totalTokens = calculateTotalTokens(NaN);
      expect(totalTokens).toBe(0);
    });

    it("should clamp to MAX_M2 (2500 m² = 250 tokens)", () => {
      expect(calculateTotalTokens(2500)).toBe(250);
      expect(calculateTotalTokens(2600)).toBe(250);
      expect(calculateTotalTokens(5000)).toBe(250);
    });

    it("should handle small m² values", () => {
      expect(calculateTotalTokens(1)).toBe(0);
      expect(calculateTotalTokens(9)).toBe(0);
      expect(calculateTotalTokens(10)).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 4: Cálculo de Costo por Tipo de Recinto
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 4: Token Cost by Room Type", () => {
    it("should calculate simple room cost (5 tokens each)", () => {
      const counts = {
        habitacionesSimples: 3,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.habitacionesSimples).toBe(15); // 3 * 5
    });

    it("should calculate double room cost (8 tokens each)", () => {
      const counts = {
        habitacionesSimples: 0,
        habitacionesDobles: 2,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.habitacionesDobles).toBe(16); // 2 * 8
    });

    it("should calculate triple room cost (12 tokens each)", () => {
      const counts = {
        habitacionesSimples: 0,
        habitacionesDobles: 0,
        habitacionesTriples: 1,
        banios: 0,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.habitacionesTriples).toBe(12); // 1 * 12
    });

    it("should calculate bathroom cost (4 tokens each)", () => {
      const counts = {
        habitacionesSimples: 0,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 3,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.banios).toBe(12); // 3 * 4
    });

    it("should calculate common area cost (12 tokens each)", () => {
      const counts = {
        habitacionesSimples: 0,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 2,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.areasComunes).toBe(24); // 2 * 12
    });

    it("should calculate mixed room costs correctly", () => {
      const counts = {
        habitacionesSimples: 2,
        habitacionesDobles: 1,
        habitacionesTriples: 1,
        banios: 2,
        areasComunes: 1,
      };

      const byType = calculateTokensUsedByType(counts);
      const total = calculateTotalTokensUsed(byType);

      // 2*5 + 1*8 + 1*12 + 2*4 + 1*12 = 10 + 8 + 12 + 8 + 12 = 50
      expect(total).toBe(50);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 5: Transiciones de Estado
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 5: Status Transitions (safe → warning → danger)", () => {
    it("should identify safe state (usage ≤ 70%)", () => {
      // 100 m² = 10 tokens; 7 tokens used = 70% = safe
      const totalTokens = 10;
      const usedTokens = 7;
      const status = getStatus(usedTokens, totalTokens);

      expect(status).toBe("safe");
    });

    it("should identify warning state (70% < usage ≤ 90%)", () => {
      // 100 m² = 10 tokens; 8 tokens used = 80% = warning
      const totalTokens = 10;
      const usedTokens = 8;
      const status = getStatus(usedTokens, totalTokens);

      expect(status).toBe("warning");
    });

    it("should identify danger state (usage > 90%)", () => {
      // 100 m² = 10 tokens; 10 tokens used = 100% = danger
      const totalTokens = 10;
      const usedTokens = 10;
      const status = getStatus(usedTokens, totalTokens);

      expect(status).toBe("danger");
    });

    it("should transition through all states as usage increases", () => {
      const totalTokens = calculateTotalTokens(100); // 10 tokens

      // Safe: 5 tokens (50%)
      expect(getStatus(5, totalTokens)).toBe("safe");

      // Warning: 8 tokens (80%)
      expect(getStatus(8, totalTokens)).toBe("warning");

      // Danger: 10 tokens (100%)
      expect(getStatus(10, totalTokens)).toBe("danger");
    });

    it("should use custom thresholds if provided", () => {
      const customThresholds = { safe: 0.5, warning: 0.75, danger: 1.0 };
      const ratio = 0.6;

      const status = getStatusByRatio(ratio, customThresholds);
      expect(status).toBe("warning");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 6: Costo Dinámico por Tipo de Habitación
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 6: Dynamic Room Costs", () => {
    it("should respect cost differences: simple < double < triple", () => {
      const simpleCost = DEFAULT_COSTS.habitacionSimple; // 5
      const doubleCost = DEFAULT_COSTS.habitacionDoble; // 8
      const tripleCost = DEFAULT_COSTS.habitacionTriple; // 12

      expect(simpleCost).toBeLessThan(doubleCost);
      expect(doubleCost).toBeLessThan(tripleCost);
    });

    it("should allow custom cost map", () => {
      const customCosts = {
        habitacionSimple: 10,
        habitacionDoble: 15,
        habitacionTriple: 20,
        banio: 5,
        area_comun: 25,
      };

      const counts = {
        habitacionesSimples: 1,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts, customCosts);
      expect(byType.habitacionesSimples).toBe(10);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 7: Validación de Adición de Recinto
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 7: Add Room Validation", () => {
    it("should provide clear reason when addition is blocked", () => {
      const result = validateTokensForAddition(10, 3);

      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain("10 tokens");
      expect(result.reason).toContain("3");
    });

    it("should provide clear reason when addition is allowed", () => {
      const result = validateTokensForAddition(10, 15);

      expect(result.canAdd).toBe(true);
      expect(result.reason).toContain("15 tokens disponibles");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 8: Descripción de Estado
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 8: Status Description Generation", () => {
    it("should generate safe status description", () => {
      const desc = generateStatusDescription("safe", 5, 5, 10);

      expect(desc.message).toContain("✅");
      expect(desc.message).toContain("disponible");
      expect(desc.subtitle).toContain("5 tokens");
      expect(desc.color).toBeDefined();
    });

    it("should generate warning status description", () => {
      const desc = generateStatusDescription("warning", 1, 9, 10);

      expect(desc.message).toContain("⚠️");
      expect(desc.subtitle).toContain("1 tokens");
    });

    it("should generate danger status description with excess info", () => {
      const desc = generateStatusDescription("danger", 0, 15, 10);

      expect(desc.message).toContain("❌");
      expect(desc.subtitle).toContain("Exceso de 5 tokens");
    });

    it("should include color codes for UI", () => {
      const safeDesc = generateStatusDescription("safe", 5, 5, 10);
      const warningDesc = generateStatusDescription("warning", 1, 9, 10);
      const dangerDesc = generateStatusDescription("danger", 0, 15, 10);

      expect(safeDesc.color).toBe("#7ab87a"); // green
      expect(warningDesc.color).toBe("#e88a40"); // orange
      expect(dangerDesc.color).toBe("#e84040"); // red
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 9: Manejo de Valores Inválidos
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 9: Invalid Values Handling", () => {
    it("should handle null counts", () => {
      const byType = calculateTokensUsedByType(null);

      expect(byType.habitacionesSimples).toBe(0);
      expect(byType.banios).toBe(0);
    });

    it("should handle undefined counts", () => {
      const byType = calculateTokensUsedByType(undefined);

      expect(byType.habitacionesSimples).toBe(0);
    });

    it("should handle undefined individual properties", () => {
      const counts = {
        habitacionesSimples: undefined,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: undefined,
        areasComunes: 0,
      };

      const byType = calculateTokensUsedByType(counts);
      expect(byType.habitacionesSimples).toBe(0);
      expect(byType.banios).toBe(0);
    });

    it("should handle non-numeric available tokens", () => {
      const available = calculateAvailableTokens("invalid", 5);
      expect(available).toBe(0);
    });

    it("should handle division by zero in percentage", () => {
      const percentage = calculateUsagePercentage(5, 0);
      expect(percentage).toBe(0);
    });

    it("should clamp percentage to 100%", () => {
      const percentage = calculateUsagePercentage(150, 100);
      expect(percentage).toBeLessThanOrEqual(100);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 10: Límite MAX_M2
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 10: MAX_M2 Boundary", () => {
    it("should enforce MAX_M2 limit (2500 m²)", () => {
      const exactMax = calculateTotalTokens(2500);
      const overMax = calculateTotalTokens(5000);

      expect(exactMax).toBe(overMax);
      expect(exactMax).toBe(250);
    });

    it("should export MAX_M2 constant", () => {
      expect(MAX_M2).toBe(2500);
    });

    it("should not allow tokens to grow beyond MAX_M2 cap", () => {
      const at2500 = calculateTotalTokens(2500);
      const at3000 = calculateTotalTokens(3000);
      const at10000 = calculateTotalTokens(10000);

      expect(at2500).toBe(at3000);
      expect(at2500).toBe(at10000);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 11: Cálculo de Ratio y Estado
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 11: Ratio-Based Status Calculation", () => {
    it("should calculate usage percentage correctly", () => {
      const percentage1 = calculateUsagePercentage(5, 10); // 50%
      const percentage2 = calculateUsagePercentage(7, 10); // 70%
      const percentage3 = calculateUsagePercentage(9, 10); // 90%

      expect(percentage1).toBe(50);
      expect(percentage2).toBe(70);
      expect(percentage3).toBe(90);
    });

    it("should get status from ratio using thresholds", () => {
      expect(getStatusByRatio(0.5)).toBe("safe");
      expect(getStatusByRatio(0.7)).toBe("safe");
      expect(getStatusByRatio(0.71)).toBe("warning");
      expect(getStatusByRatio(0.9)).toBe("warning");
      expect(getStatusByRatio(0.91)).toBe("danger");
      expect(getStatusByRatio(1.0)).toBe("danger");
    });

    it("should return safe when total is zero", () => {
      const status = getStatus(0, 0);
      expect(status).toBe("safe");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ESCENARIO 12: Flujo Completo de Cálculo
  // ────────────────────────────────────────────────────────────────
  describe("Escenario 12: Complete Calculation Workflow", () => {
    it("should calculate all values together correctly", () => {
      const params = {
        m2Totales: 100,
        habitacionesSimples: 2,
        habitacionesDobles: 1,
        habitacionesTriples: 0,
        banios: 1,
        areasComunes: 1,
      };

      const result = calculateTokensComplete(params);

      // 100 m² = 10 tokens
      expect(result.totalTokens).toBe(10);

      // 2*5 + 1*8 + 1*4 + 1*12 = 34 tokens used
      expect(result.usedTokens).toBe(34);

      // Available should be negative (danger state)
      expect(result.availableTokens).toBe(0); // clamped to 0

      // Status should be danger
      expect(result.status).toBe("danger");

      // Should have description
      expect(result.description.message).toBeDefined();
      expect(result.description.subtitle).toBeDefined();
      expect(result.description.color).toBeDefined();
    });

    it("should handle safe state in complete workflow", () => {
      const params = {
        m2Totales: 200,
        habitacionesSimples: 2,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 1,
        areasComunes: 0,
      };

      const result = calculateTokensComplete(params);

      // 200 m² = 20 tokens
      expect(result.totalTokens).toBe(20);

      // 2*5 + 1*4 = 14 tokens
      expect(result.usedTokens).toBe(14);

      // 20 - 14 = 6 available
      expect(result.availableTokens).toBe(6);

      // 14/20 = 70% = safe
      expect(result.status).toBe("safe");
    });

    it("should allow custom costs in complete workflow", () => {
      const customCosts = {
        habitacionSimple: 10,
        habitacionDoble: 15,
        habitacionTriple: 20,
        banio: 8,
        area_comun: 25,
      };

      const params = {
        m2Totales: 100,
        habitacionesSimples: 1,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 0,
        areasComunes: 0,
      };

      const result = calculateTokensComplete(params, customCosts);

      // Should use custom cost (10 instead of 5)
      expect(result.usedTokens).toBe(10);
    });

    it("should return complete description with all fields", () => {
      const result = calculateTokensComplete({
        m2Totales: 100,
        habitacionesSimples: 1,
        habitacionesDobles: 0,
        habitacionesTriples: 0,
        banios: 1,
        areasComunes: 0,
      });

      expect(result.tokensUsedByType).toBeDefined();
      expect(result.usedTokens).toBeDefined();
      expect(result.totalTokens).toBeDefined();
      expect(result.availableTokens).toBeDefined();
      expect(result.usagePercentage).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });
});
