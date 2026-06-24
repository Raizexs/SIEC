# Normativa de construcción — Chile 2026 (referencia SIEC)

Breve guía de las normas que el motor SIEC valida o sugiere en diseño y presupuesto.

## Ley 21.725 (Ley del Mono)

Regularización de autoconstrucciones hasta **31-dic-2027** (DS 18 MINVU).

| Parámetro | Valor |
|-----------|-------|
| Umbral social mínimo | 90 m² |
| Umbral social máximo | 140 m² |
| Tope de tasación | &lt; 520 UF |

**SIEC:** bloquea diseños &gt; 140 m² o tasación ≥ 520 UF dentro del umbral social. Endpoint: `POST /api/validar-ley-mono`, agregado en `POST /api/validar-normativa`.

- [Biblioteca del Congreso — Ley 21.725](https://www.bcn.cl/leychile/navegar?idNorma=1201231)
- MINVU / regularización DS 18

## OGUC (Ordenanza General de Urbanismo y Construcciones)

Marco general de habitabilidad, alturas libres, ventilación e iluminación.

| Regla SIEC | Valor |
|------------|-------|
| Altura libre mínima de recinto | **2,1 m** |

La OGUC exige altura suficiente en locales habitables; SIEC alerta si un recinto modelado queda bajo 2,1 m.

- [OGUC — MINVU](https://www.minvu.gob.cl/)

## LOSCAT — Acondicionamiento térmico

**Listado Oficial de Soluciones Constructivas para Acondicionamiento Térmico** (DS N°47, MINVU).

Aplica a envolventes opacas (muros, techos, pisos sobre terreno). En ampliaciones con **mampostería u hormigón** en muros exteriores, SIEC sugiere inyectar aislación térmica compatible (lana mineral, EPS, barrera de vapor).

- [LOSCAT — MINVU](https://www.minvu.gob.cl/)

## LOSCAA — Acondicionamiento acústico

**Listado Oficial de Soluciones Constructivas para Acondicionamiento Acústico** (resoluciones exentas MINVU).

Tabiques entre **habitación y baño** deben considerar confort acústico y, según altura y uso, resistencia al fuego (doble placa + lana mineral).

- [LOSCAA — MINVU](https://www.minvu.gob.cl/)

## API de validación agregada

```http
POST /api/validar-normativa
Content-Type: application/json

{
  "area_m2": 100,
  "valor_uf_actual": 38500,
  "costo_total_clp": 15000000,
  "material_id": 3,
  "recintos": [
    { "id": "r1", "tipo": "habitacion", "altura_m": 2.4 }
  ],
  "muros": [
    { "es_exterior": true, "material_id": 3 },
    { "es_interior": true, "tipos_adyacentes": ["habitacion", "banio"] }
  ]
}
```

Respuesta: `{ "alerts": [], "injections": [], "compliant": true }`.

- **alerts:** incumplimientos o advertencias (Ley 21.725, altura OGUC).
- **injections:** sugerencias normativas no bloqueantes (LOSCAT, LOSCAA).
- **compliant:** `false` si hay alertas bloqueantes.
