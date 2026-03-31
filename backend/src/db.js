const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'data', 'siec.db');

async function getDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await getDb();

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS Material_Estructural (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Configuracion_Simulacion (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      M2_Totales INTEGER NOT NULL,
      Material_Estructural_ID INTEGER NOT NULL,
      Habitaciones INTEGER NOT NULL,
      Banios INTEGER NOT NULL,
      Areas_Comunes INTEGER NOT NULL,
      Fecha_Creacion TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural (ID)
    );
  `);

  await db.run(
    `INSERT OR IGNORE INTO Material_Estructural (ID, Nombre) VALUES
      (1, 'Madera'),
      (2, 'Metalcom'),
      (3, 'Albañilería'),
      (4, 'Hormigón Armado')`
  );

  return db;
}

async function getSimulationById(db, id) {
  return db.get(
    `SELECT
      cs.ID AS simulacion_id,
      cs.M2_Totales,
      cs.Habitaciones,
      cs.Banios,
      cs.Areas_Comunes,
      cs.Fecha_Creacion,
      me.ID AS material_id,
      me.Nombre AS material_nombre
    FROM Configuracion_Simulacion cs
    INNER JOIN Material_Estructural me
      ON me.ID = cs.Material_Estructural_ID
    WHERE cs.ID = ?`,
    [id]
  );
}

async function materialExists(db, materialId) {
  const row = await db.get(
    'SELECT ID FROM Material_Estructural WHERE ID = ?',
    [materialId]
  );
  return Boolean(row);
}

async function insertSimulation(db, payload) {
  const result = await db.run(
    `INSERT INTO Configuracion_Simulacion (
      M2_Totales,
      Material_Estructural_ID,
      Habitaciones,
      Banios,
      Areas_Comunes
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      payload.m2Totales,
      payload.materialEstructuralId,
      payload.habitaciones,
      payload.banios,
      payload.areasComunes
    ]
  );

  return result.lastID;
}

async function getAllConfigurations(db) {
  return db.all(
    `SELECT
      cs.ID AS simulacion_id,
      cs.M2_Totales,
      cs.Habitaciones,
      cs.Banios,
      cs.Areas_Comunes,
      cs.Fecha_Creacion,
      me.ID AS material_id,
      me.Nombre AS material_nombre
    FROM Configuracion_Simulacion cs
    LEFT JOIN Material_Estructural me
      ON me.ID = cs.Material_Estructural_ID
    ORDER BY cs.Fecha_Creacion DESC`
  );
}

module.exports = {
  initDb,
  getSimulationById,
  materialExists,
  insertSimulation,
  getAllConfigurations
};
