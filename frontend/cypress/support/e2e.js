// Cypress support file
// This file runs before every test file

// Disable uncaught exception handling for this spec
Cypress.on("uncaught:exception", (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  if (err.message.includes("WebGL")) {
    return false;
  }
  // Let other errors fail the test as expected
  return true;
});

// Global helpers
Cypress.Commands.add("getByTestId", (id) => {
  cy.get(`[data-testid="${id}"]`);
});

Cypress.Commands.add(
  "fillFormAndGenerate",
  (m2, simples, dobles, triples, banios) => {
    // Fill m² input
    cy.get('input[type="text"]')
      .first()
      .clear({ force: true })
      .type(m2.toString(), { force: true });

    cy.wait(200);

    // Fill room counts
    if (simples !== undefined) {
      cy.get('input[type="number"]')
        .eq(0)
        .clear({ force: true })
        .type(simples.toString(), { force: true });
    }
    if (dobles !== undefined) {
      cy.get('input[type="number"]')
        .eq(1)
        .clear({ force: true })
        .type(dobles.toString(), { force: true });
    }
    if (triples !== undefined) {
      cy.get('input[type="number"]')
        .eq(2)
        .clear({ force: true })
        .type(triples.toString(), { force: true });
    }
    if (banios !== undefined) {
      cy.get('input[type="number"]')
        .eq(3)
        .clear({ force: true })
        .type(banios.toString(), { force: true });
    }

    // Click generate button
    cy.get("button")
      .contains(/Guardar y Generar Layout|Save & Generate Layout/i)
      .click({ force: true });

    cy.wait(500);
  },
);

Cypress.Commands.add("verifyCanvasActive", () => {
  // Check SVG editor 2D
  cy.get("svg").should("be.visible");

  // Check Three.js canvas
  cy.get("canvas").should("exist").and("be.visible");

  // Verify no WebGL context loss
  cy.window().then((win) => {
    expect(win.webglContextLost).to.equal(false);
  });
});
