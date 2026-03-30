const express = require('express');
const { getSimulationById } = require('./db');

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/simulacion/:id/parametros', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'ID de simulacion invalido. Debe ser un entero positivo.'
      });
    }

    try {
      const row = await getSimulationById(db, id);

      if (!row) {
        return res.status(404).json({
          error: `No existe una simulacion con ID ${id}.`
        });
      }

      return res.status(200).json({
        id: row.simulacion_id,
        m2Totales: row.M2_Totales,
        materialEstructural: {
          id: row.material_id,
          nombre: row.material_nombre
        },
        recintos: {
          habitaciones: row.Habitaciones,
          banios: row.Banios,
          areasComunes: row.Areas_Comunes
        },
        fechaCreacion: row.Fecha_Creacion
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Error interno al consultar parametros de simulacion.',
        detail: error.message
      });
    }
  });

  return app;
}

module.exports = { createApp };
