const express = require('express');
const { materialExists, insertSimulation } = require('./db');

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function validatePayload(body) {
  const payload = {
    m2Totales: parseInteger(body.m2Totales),
    materialEstructuralId: parseInteger(body.materialEstructuralId),
    habitaciones: parseInteger(body.habitaciones),
    banios: parseInteger(body.banios),
    areasComunes: parseInteger(body.areasComunes)
  };

  if (
    payload.m2Totales === null ||
    payload.materialEstructuralId === null ||
    payload.habitaciones === null ||
    payload.banios === null ||
    payload.areasComunes === null
  ) {
    return { valid: false, message: 'Todos los campos son obligatorios y deben ser enteros.' };
  }

  if (payload.m2Totales < 15 || payload.m2Totales > 1000) {
    return { valid: false, message: 'm2Totales debe estar entre 15 y 1000.' };
  }

  if (payload.habitaciones < 0 || payload.banios < 0 || payload.areasComunes < 0) {
    return { valid: false, message: 'Las cantidades de recintos no pueden ser negativas.' };
  }

  return { valid: true, payload };
}

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/api/simulacion/parametros', async (req, res) => {
    try {
      const validation = validatePayload(req.body || {});
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      const payload = validation.payload;
      const exists = await materialExists(db, payload.materialEstructuralId);
      if (!exists) {
        return res.status(400).json({
          error: `Material estructural ID ${payload.materialEstructuralId} no existe.`
        });
      }

      const id = await insertSimulation(db, payload);

      return res.status(201).json({
        idSimulacion: id,
        message: 'Parametros guardados correctamente.'
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Error interno al guardar los parametros de simulacion.',
        detail: error.message
      });
    }
  });

  return app;
}

module.exports = { createApp };
