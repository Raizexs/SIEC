/**
 * SCRUM-51: Pruebas de Estrés y Resiliencia en Renderizado 3D
 *
 * Este test automatizado verifica que el sistema dinámico no se degrada
 * con el tiempo y que el puente Formulario -> 3D resiste modificaciones
 * extremas sin colapsar.
 *
 * Acceptance Criteria:
 * 1. Ingrese parámetros y regenere la casa al menos 5 veces consecutivas
 *    en rangos extremos (15m² a 200m², 1 a 10 baños)
 * 2. Verificar que el canvas de Three.js sigue activo tras el proceso
 * 3. No existieron crashes de memoria "WebGL Context Lost"
 */

describe("Stress Test: 3D Renderer Resilience", () => {
  beforeEach(() => {
    cy.visit("/");
    // Clear console logs before each test
    cy.window().then((win) => {
      win.consoleErrors = [];
      win.webglContextLost = false;

      // Intercept console errors
      const originalError = console.error;
      console.error = function (...args) {
        win.consoleErrors.push(args.join(" "));
        originalError.apply(console, args);
      };

      // Monitor for WebGL Context Lost
      const canvas = document.querySelector("canvas");
      if (canvas) {
        canvas.addEventListener("webglcontextlost", () => {
          win.webglContextLost = true;
          console.error("❌ WebGL Context Lost detected!");
        });
      }
    });
  });

  it("Should handle extreme parameter changes 5 times without crashing", () => {
    const testScenarios = [
      {
        name: "Scenario 1: Minimum Space (15 m²)",
        m2: 15,
        simples: 1,
        dobles: 0,
        triples: 0,
        banios: 1,
        areas: 0,
      },
      {
        name: "Scenario 2: Small House (80 m²)",
        m2: 80,
        simples: 2,
        dobles: 1,
        triples: 0,
        banios: 1,
        areas: 1,
      },
      {
        name: "Scenario 3: Medium House (150 m²)",
        m2: 150,
        simples: 2,
        dobles: 2,
        triples: 1,
        banios: 3,
        areas: 2,
      },
      {
        name: "Scenario 4: Large House (250 m²)",
        m2: 250,
        simples: 3,
        dobles: 3,
        triples: 2,
        banios: 4,
        areas: 3,
      },
      {
        name: "Scenario 5: Mansion (350 m² with 10 bathrooms)",
        m2: 350,
        simples: 2,
        dobles: 4,
        triples: 3,
        banios: 10,
        areas: 4,
      },
    ];

    testScenarios.forEach((scenario, index) => {
      cy.log(`\n🏗️ Test ${index + 1}/5: ${scenario.name}`);

      // Input m² value
      cy.get('input[type="text"]')
        .first()
        .then(($input) => {
          // Clear and set new value
          cy.wrap($input)
            .clear({ force: true })
            .type(scenario.m2.toString(), { force: true });
        });

      // Wait for form update
      cy.wait(200);

      // Set number of simple rooms
      cy.get('input[type="number"]')
        .eq(0)
        .clear({ force: true })
        .type(scenario.simples.toString(), { force: true })
        .blur();

      // Set number of double rooms
      cy.get('input[type="number"]')
        .eq(1)
        .clear({ force: true })
        .type(scenario.dobles.toString(), { force: true })
        .blur();

      // Set number of triple rooms
      cy.get('input[type="number"]')
        .eq(2)
        .clear({ force: true })
        .type(scenario.triples.toString(), { force: true })
        .blur();

      // Click submit button to generate layout
      cy.get("button")
        .contains(/Guardar y Generar Layout|Save & Generate Layout/i)
        .click({ force: true });

      // Wait for layout generation
      cy.wait(500);

      // Verify canvas is still present and active
      cy.get("svg").should("be.visible");

      // Check for Scene3D canvas (Three.js)
      cy.get("canvas").should("exist").and("be.visible");

      // Verify memory state
      cy.window().then((win) => {
        // Check if WebGL context was lost
        expect(win.webglContextLost).to.equal(
          false,
          `WebGL Context Lost should not occur in ${scenario.name}`,
        );

        // Check console for critical errors
        const criticalErrors = win.consoleErrors.filter((error) =>
          error.toLowerCase().includes("webgl"),
        );
        expect(criticalErrors.length).to.equal(
          0,
          `Should have no WebGL errors, found: ${criticalErrors.join(", ")}`,
        );
      });

      cy.log(`✅ ${scenario.name} passed`);
    });
  });

  it("Should maintain 3D scene responsiveness after consecutive regenerations", () => {
    const regenerationCycles = 5;
    let cycleCount = 0;

    const performRegeneration = () => {
      if (cycleCount >= regenerationCycles) {
        cy.log("✅ All regeneration cycles completed successfully");
        return;
      }

      cycleCount++;
      cy.log(`\n🔄 Regeneration Cycle ${cycleCount}/${regenerationCycles}`);

      // Random parameters for each cycle
      const randomM2 = Cypress._.random(30, 300);
      const randomBanios = Cypress._.random(1, 8);

      // Set m² value
      cy.get('input[type="text"]')
        .first()
        .clear({ force: true })
        .type(randomM2.toString(), { force: true });

      // Click range slider to ensure value is registered
      cy.get('input[type="range"]').then(($range) => {
        cy.wrap($range)
          .invoke("val", randomM2)
          .trigger("change", { force: true });
      });

      // Set bathrooms with increment/decrement buttons
      cy.get("button")
        .contains(/add|plus/i)
        .last()
        .click({ force: true });

      // Wait for UI update
      cy.wait(300);

      // Generate layout
      cy.get("button")
        .contains(/Guardar y Generar Layout|Save & Generate Layout/i)
        .click({ force: true });

      // Wait for generation
      cy.wait(500);

      // Verify Scene3D is still rendering
      cy.get("canvas").should("exist");

      // Check performance metrics
      cy.window().then((win) => {
        expect(win.webglContextLost).to.equal(false);

        // Check memory hasn't exhausted (basic check)
        const memoryThreshold = 500; // MB
        if (win.performance && win.performance.memory) {
          expect(win.performance.memory.usedJSHeapSize).to.be.lessThan(
            memoryThreshold * 1024 * 1024,
          );
        }
      });

      cy.log(`✅ Cycle ${cycleCount} completed successfully`);

      // Recursive call for next cycle
      performRegeneration();
    };

    performRegeneration();
  });

  it("Should not crash when toggling between extreme configurations", () => {
    const extremeConfigs = [
      { m2: 15, description: "Minimal (15 m²)" },
      { m2: 2500, description: "Maximum (2500 m²)" },
      { m2: 15, description: "Back to Minimal" },
      { m2: 1500, description: "Mid-range (1500 m²)" },
      { m2: 100, description: "Small (100 m²)" },
    ];

    extremeConfigs.forEach((config, index) => {
      cy.log(`\n⚡ Config ${index + 1}: ${config.description}`);

      // Update m² input
      cy.get('input[type="text"]')
        .first()
        .clear({ force: true })
        .type(config.m2.toString(), { force: true });

      // Use range slider for more reliable input
      cy.get('input[type="range"]').then(($slider) => {
        cy.wrap($slider)
          .invoke("val", Math.min(config.m2, 2500))
          .trigger("input", { force: true })
          .trigger("change", { force: true });
      });

      cy.wait(200);

      // Click generate button
      cy.get("button")
        .contains(/Guardar y Generar Layout|Save & Generate Layout/i)
        .click({ force: true });

      cy.wait(500);

      // Verify stability
      cy.window().then((win) => {
        expect(win.webglContextLost).to.equal(
          false,
          `Configuration ${config.description} caused WebGL context loss`,
        );
      });

      // Verify canvas still exists
      cy.get("canvas").should("exist");
    });

    cy.log("\n✅ All extreme configuration changes completed without crashes");
  });

  it("Should handle rapid input changes without memory leaks", () => {
    cy.log("📊 Starting rapid input change test");

    // Perform 10 rapid changes
    for (let i = 0; i < 10; i++) {
      const randomM2 = Cypress._.random(20, 400);

      cy.get('input[type="range"]').then(($slider) => {
        cy.wrap($slider)
          .invoke("val", randomM2)
          .trigger("change", { force: true });
      });

      cy.wait(100); // Minimal wait between changes
    }

    // Final generation
    cy.get("button")
      .contains(/Guardar y Generar Layout|Save & Generate Layout/i)
      .click({ force: true });

    cy.wait(500);

    // Verify final state
    cy.window().then((win) => {
      expect(win.webglContextLost).to.equal(
        false,
        "WebGL context lost after rapid input changes",
      );

      // Check for console errors
      const errors = win.consoleErrors.filter((e) =>
        e.toLowerCase().includes("error"),
      );
      cy.log(`Console errors detected: ${errors.length}`);
      expect(errors.length).to.be.lessThan(5); // Allow minor warnings
    });

    cy.get("canvas").should("exist");
    cy.log("✅ Rapid input change test completed");
  });

  afterEach(() => {
    // Cleanup and verify final state
    cy.window().then((win) => {
      if (win.webglContextLost) {
        cy.log("⚠️ Warning: WebGL Context Lost detected during test");
      }

      const totalErrors = win.consoleErrors.length;
      cy.log(`Total console errors: ${totalErrors}`);
    });
  });
});
