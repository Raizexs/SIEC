import { describe, it, expect, beforeEach } from "vitest";
import { useTokenCounter } from "../useTokenCounter";

describe("useTokenCounter Composable", () => {
  let counter;

  beforeEach(() => {
    counter = useTokenCounter();
  });

  it("calculates available tokens correctly", () => {
    counter.m2Totales.value = 100;
    counter.habitacionesSimples.value = 2;
    counter.banios.value = 1;
    counter.areasComunes.value = 1;

    // 100 m² = 10 tokens; 2*5 + 1*4 + 1*12 = 26 tokens used
    expect(counter.tokensUsados.value).toBe(26);
    expect(counter.tokensDisponibles.value).toBe(0); // 10 - 26 = -16, clamped to 0
    expect(counter.estado.value).toBe("danger");
  });

  it("identifies warning state", () => {
    counter.m2Totales.value = 100;
    counter.habitacionesSimples.value = 6;
    counter.banios.value = 3;
    counter.areasComunes.value = 1;

    // 100 m² = 10 tokens; 6*5 + 3*4 + 1*12 = 54 tokens used (over budget)
    expect(counter.tokensUsados.value).toBe(54);
    expect(counter.estado.value).toBe("danger");
  });

  it("identifies danger state", () => {
    counter.m2Totales.value = 100;
    counter.habitacionesSimples.value = 8;
    counter.banios.value = 3;
    counter.areasComunes.value = 2;

    // 100 m² = 10 tokens; 8*5 + 3*4 + 2*12 = 88 tokens used (way over budget)
    expect(counter.estado.value).toBe("danger");
    expect(counter.tokensDisponibles.value).toBe(0);
  });

  it("identifies safe state with balanced config", () => {
    counter.m2Totales.value = 200;
    counter.habitacionesSimples.value = 2;
    counter.banios.value = 1;
    counter.areasComunes.value = 0;

    // 200 m² = 20 tokens; 2*5 + 1*4 = 14 tokens used
    expect(counter.tokensUsados.value).toBe(14);
    expect(counter.tokensDisponibles.value).toBe(6);
    expect(counter.estado.value).toBe("safe");
  });
});
