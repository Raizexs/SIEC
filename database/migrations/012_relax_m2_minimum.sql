-- ════════════════════════════════════════════════════════════════════════════════
-- Migración 012: Relajar restricción mínima de m² en Configuracion_Simulacion
-- ════════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    BEGIN
        ALTER TABLE configuracion_simulacion DROP CONSTRAINT IF EXISTS configuracion_simulacion_m2_totales_check;
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;

    BEGIN
        ALTER TABLE "Configuracion_Simulacion" DROP CONSTRAINT IF EXISTS "Configuracion_Simulacion_M2_Totales_check";
    EXCEPTION
        WHEN undefined_table THEN
            NULL;
    END;
END $$;

ALTER TABLE configuracion_simulacion ADD CONSTRAINT configuracion_simulacion_m2_totales_check CHECK (m2_totales >= 1 AND m2_totales <= 1000);
