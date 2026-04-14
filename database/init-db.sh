#!/bin/bash
# Script de inicialización de base de datos para Docker
# Ejecuta automáticamente todas las migraciones y seeds en orden

set -e

echo "=========================================="
echo "Iniciando base de datos SIEC con HU10..."
echo "=========================================="

# Esperar a que PostgreSQL esté completamente listo
echo "Esperando que PostgreSQL esté listo..."
sleep 5

# Variables
DB_NAME="siec_db"
DB_USER="siec_user"
DB_PASSWORD="siec_password"
PGPASSWORD="$DB_PASSWORD"

export PGPASSWORD

echo "✅ PostgreSQL está listo"
echo ""

# 1. Crear tabla Material_Estructural
echo "📌 Ejecutando: 001_create_material_estructural.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Crear tabla Material_Estructural
CREATE TABLE IF NOT EXISTS Material_Estructural (
    ID SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE,
    Descripcion TEXT,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fecha_Actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_nombre_not_empty CHECK (Nombre <> '')
);

CREATE INDEX IF NOT EXISTS idx_nombre ON Material_Estructural(Nombre);

-- Configurar secuencia
SELECT setval('material_estructural_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM material_estructural), false);

\echo '✅ Tabla Material_Estructural creada'
EOF

# 2. Crear tabla Configuracion_Simulacion
echo "📌 Ejecutando: 002_create_configuracion_simulacion.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Crear tabla Configuracion_Simulacion
CREATE TABLE IF NOT EXISTS Configuracion_Simulacion (
    ID SERIAL PRIMARY KEY,
    Material_Estructural_ID INTEGER NOT NULL,
    M2_Totales DECIMAL(10, 2) NOT NULL,
    Habitaciones INTEGER NOT NULL DEFAULT 0,
    Banios INTEGER NOT NULL DEFAULT 0,
    Areas_Comunes INTEGER NOT NULL DEFAULT 0,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fecha_Actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_material FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural(ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_m2 CHECK (M2_Totales >= 15 AND M2_Totales <= 200),
    CONSTRAINT chk_habitaciones CHECK (Habitaciones >= 0),
    CONSTRAINT chk_banios CHECK (Banios >= 0),
    CONSTRAINT chk_areas CHECK (Areas_Comunes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_material ON Configuracion_Simulacion(Material_Estructural_ID);

\echo '✅ Tabla Configuracion_Simulacion creada'
EOF

# 3. Crear tabla Rendimiento_Constructivo (HU10)
echo "📌 Ejecutando: 003_create_rendimiento_constructivo.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Crear tabla Rendimiento_Constructivo (HU10)
CREATE TABLE IF NOT EXISTS Rendimiento_Constructivo (
    ID SERIAL PRIMARY KEY,
    Material_Estructural_ID INTEGER NOT NULL UNIQUE,
    Factor_Rendimiento DECIMAL(8, 4) NOT NULL,
    Insumo_Base VARCHAR(100) NOT NULL,
    Unidad VARCHAR(50) DEFAULT 'm²',
    Descripcion TEXT,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fecha_Actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_hu10 FOREIGN KEY (Material_Estructural_ID) REFERENCES Material_Estructural(ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_factor CHECK (Factor_Rendimiento > 0)
);

CREATE INDEX IF NOT EXISTS idx_material_hu10 ON Rendimiento_Constructivo(Material_Estructural_ID);

\echo '✅ Tabla Rendimiento_Constructivo creada'
EOF

# 4. Insertar datos en Material_Estructural
echo "📌 Ejecutando: 001_seed_material_estructural.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
INSERT INTO Material_Estructural (ID, Nombre, Descripcion) VALUES
(1, 'Madera', 'Estructura de madera tradicional para viviendas'),
(2, 'Metalcom', 'Estructura de metal liviano para construcción rápida'),
(3, 'Albañilería', 'Estructura de ladrillo y cemento'),
(4, 'Hormigón Armado', 'Estructura de hormigón reforzado con acero')
ON CONFLICT (ID) DO NOTHING;

SELECT setval('material_estructural_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM material_estructural), false);

\echo '✅ Datos de Material_Estructural insertados'
EOF

# 5. Insertar datos de ejemplo en Configuracion_Simulacion
echo "📌 Ejecutando: 002_seed_configuracion_simulacion.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
INSERT INTO Configuracion_Simulacion (Material_Estructural_ID, M2_Totales, Habitaciones, Banios, Areas_Comunes) VALUES
(1, 100.00, 3, 2, 1),
(2, 85.50, 2, 1, 1),
(3, 120.00, 4, 2, 2),
(4, 150.00, 4, 3, 2)
ON CONFLICT DO NOTHING;

\echo '✅ Datos de Configuracion_Simulacion insertados'
EOF

# 6. Insertar factores de rendimiento (HU10)
echo "📌 Ejecutando: 003_seed_rendimiento_constructivo.sql..."
psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
INSERT INTO Rendimiento_Constructivo (ID, Material_Estructural_ID, Factor_Rendimiento, Insumo_Base, Unidad, Descripcion) VALUES
(1, 1, 0.5, 'Sacos de Cemento', 'sacos', 'Madera - Bajo consumo de insumos, construcción tradicional'),
(2, 2, 0.7, 'Sacos de Cemento', 'sacos', 'Metalcom - Consumo moderado, construcción ligera'),
(3, 3, 1.2, 'Sacos de Cemento', 'sacos', 'Albañilería - Consumo moderado-alto, obra tradicional'),
(4, 4, 1.5, 'Sacos de Cemento', 'sacos', 'Hormigón Armado - Alto consumo, mayor solidez')
ON CONFLICT (ID) DO NOTHING;

SELECT setval('rendimiento_constructivo_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM rendimiento_constructivo), false);

\echo '✅ Factores de Rendimiento_Constructivo insertados'
EOF

echo ""
echo "=========================================="
echo "✅ Base de datos inicializada correctamente"
echo "=========================================="
echo ""
echo "📊 Datos disponibles:"
echo "   - 4 Materiales Estructurales"
echo "   - 4 Configuraciones de Simulación"
echo "   - 4 Factores de Rendimiento (HU10)"
echo ""
echo "🚀 FastAPI está listo en: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🌐 Frontend está listo en: http://localhost:5173"
echo "=========================================="
