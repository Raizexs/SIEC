"""Normalization script placeholder.
Attempts to normalize Insumo.unidad_medida to 'DIA' or 'HH' when a DB is available.
Returns number of rows updated or 0 if DB not available.
"""

def normalize_unidad_mano_obra(database_url=None):
    try:
        # Import lazily to avoid hard DB dependency during tests
        from backend import models
        from backend.database import SessionLocal
        session = SessionLocal()
        updated = 0
        mapping = [
            ('jornada','DIA'),('jornadas','DIA'),('dia','DIA'),('dda','DIA'),('día','DIA'),
            ('hh','HH'),('h','HH'),('hora','HH'),('horas','HH')
        ]
        try:
            insumos = session.query(models.Insumo).all()
            for ins in insumos:
                unidad = (ins.unidad_medida or '').strip().lower()
                new = None
                for k,v in mapping:
                    if k in unidad:
                        new = v
                        break
                if new and (ins.unidad_medida or '').upper() != new:
                    ins.unidad_medida = new
                    session.add(ins)
                    updated += 1
            session.commit()
        finally:
            session.close()
        return updated
    except Exception as e:
        # No DB available or other error - safe no-op
        print('normalize_unidad_mano_obra: skipped (no db or error)')
        return 0
