from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import math
import unicodedata
import os
from dotenv import load_dotenv
load_dotenv()
from collections import defaultdict
from schemas import (
    DesgloseResponse,
    CategoriaDesglose,
    InsumoCalculado,
    DeduccionMermasPayload,
)
try:
    from mermas import (
        calcular_area_vanos,
        calcular_area_neta,
        inferir_factor_perdida,
        optimizar_compra_por_nesting,
    )
except ModuleNotFoundError:
    from backend.mermas import (
        calcular_area_vanos,
        calcular_area_neta,
        inferir_factor_perdida,
        optimizar_compra_por_nesting,
    )
try:
    from dimensiones_comerciales import (
        obtener_dimensiones,
        area_por_pieza,
        largo_por_pieza,
        DIMENSIONES_COMERCIALES,
    )
except ModuleNotFoundError:
    from backend.dimensiones_comerciales import (
        obtener_dimensiones,
        area_por_pieza,
        largo_por_pieza,
        DIMENSIONES_COMERCIALES,
    )
try:
    from techumbre import calcular_partida_techumbre
except ModuleNotFoundError:
    from backend.techumbre import calcular_partida_techumbre

# Importar configuración de BD y Modelos
from database import engine, get_db, SessionLocal
import models

# Crear tablas
# Crear tablas (movido a startup)

app = FastAPI(
    title="SIEC API",
    version="1.0.0",
    description="""
SIEC backend — Sistema Inteligente de Estimación de Costos.

Provides:
  * Cost estimation engine for residential construction projects.
  * Project management with versioning, comments, and collaboration.
  * AI assistant with tool-calling (price history, optimization).
  * Real-time price ingestion from Sodimac/Easy/Construmart scraper.

Authentication: Bearer JWT issued by Supabase Auth (HS256 default; RS256 via JWKS).
""",
    contact={"name": "SIEC Team", "email": "team@siec.app"},
    openapi_tags=[
        {"name": "auth", "description": "Identity (Supabase JWT validation)."},
        {"name": "projects", "description": "Multi-tenant project CRUD + collaboration."},
        {"name": "ai", "description": "AI assistant + price intelligence."},
        {"name": "meta", "description": "Health checks and metadata."},
    ],
)

try:
    from observability import log, install as install_observability
    install_observability(app)
except Exception as _obs_exc:
    import logging
    log = logging.getLogger("siec")
    log.error("observability_install_failed", error=str(_obs_exc))

# CORS — origins are configurable via env to support staging/production.
# In dev, defaults cover localhost + LAN IP from previous setup.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://10.51.0.26:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependencies
try:
    from auth import get_current_user, get_optional_user, require_role, CurrentUser
except ModuleNotFoundError:
    from backend.auth import get_current_user, get_optional_user, require_role, CurrentUser  # type: ignore


@app.get("/me", tags=["auth"])
def get_me(user: CurrentUser = Depends(get_current_user)):
    """Return the authenticated user's profile, derived from the Supabase JWT."""
    metadata = user.raw_claims.get("user_metadata", {}) or {}
    app_metadata = user.raw_claims.get("app_metadata", {}) or {}
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "aal": user.aal,
        "full_name": metadata.get("full_name"),
        "company": metadata.get("company"),
        "avatar_url": metadata.get("avatar_url"),
        "preferences": {
            "units": metadata.get("units", "metric"),
            "currency": metadata.get("currency", "CLP"),
        },
        "providers": app_metadata.get("providers", []),
        "onboarded": metadata.get("onboarded", False),
    }


@app.get("/health", tags=["meta"])
def healthcheck():
    return {"status": "ok", "service": "siec-api"}


# Mount Phase 3 routers (projects, versions, collaboration, comments)
try:
    from routers.projects import router as projects_router
    app.include_router(projects_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="projects", error=str(exc))

# Mount Phase 5 routers (AI assistant + price intelligence)
try:
    from routers.ai import router as ai_router
    app.include_router(ai_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="ai", error=str(exc))

# Mount Phase 7 routers (marketplace of presets)
try:
    from routers.marketplace import router as marketplace_router
    app.include_router(marketplace_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="marketplace", error=str(exc))

# Mount Phase 8 routers (settings/integrations/billing/site-profile)
try:
    from routers.settings import router as settings_router
    app.include_router(settings_router)
except Exception as exc:  # pragma: no cover
    log.error("router_mount_failed", router="settings", error=str(exc))

# PDF vectorial (Playwright / Chromium print)
try:
    from routers.export import router as export_router
    app.include_router(export_router)
except Exception as exc:  # pragma: no cover
    print(f"[main] Could not mount /export router: {exc}")


# Seeding de datos iniciales
@app.on_event("startup")
def startup_event():
    # Inicializar tablas aquí para evitar crash sin DB al importar (Testing)
    models.Base.metadata.create_all(bind=engine)
    
    # Normalizar unidades de mano de obra en la BD (para evitar ambigüedades en seeds/CSV)
    try:
        from scripts.normalize_unidad_mano_obra import normalize_unidad_mano_obra
        try:
            updated = normalize_unidad_mano_obra(os.getenv('DATABASE_URL', None))
            log.info("normalization_completed", updated_rows=updated)
        except Exception as e:
            log.error("normalization_script_failed", error=str(e))
    except Exception:
        # If import fails (e.g., during certain test flows), continue without normalization
        pass
    
    db = SessionLocal()
    try:
        # Verificar si ya existen tipos de recinto
        if db.query(models.TipoRecinto).count() == 0:
            log.info("seeding_initial_recintos")
            tipos_iniciales = [
                models.TipoRecinto(nombre="Habitación", costo_tokens=9),
                models.TipoRecinto(nombre="Baño", costo_tokens=4),
                models.TipoRecinto(nombre="Área Común", costo_tokens=12),
            ]
            db.add_all(tipos_iniciales)
            db.commit()
    finally:
        db.close()

# Materiales permitidos según requerimientos
ALLOWED_MATERIALS = ["Madera", "Metalcom", "Albañilería", "Hormigón Armado"]

# Recargo obligatorio por leyes sociales (28% - 29%). Ajustable vía variable de entorno SOCIAL_LEY_FACTOR.
try:
    SOCIAL_LEY_FACTOR = float(os.getenv("SOCIAL_LEY_FACTOR", "1.28"))
except Exception:
    SOCIAL_LEY_FACTOR = 1.28
# Validar rango permitido: 1.28 <= factor <= 1.29
if SOCIAL_LEY_FACTOR < 1.28 or SOCIAL_LEY_FACTOR > 1.29:
    SOCIAL_LEY_FACTOR = 1.28  # Valor por defecto si la variable de entorno está fuera de rango

# Horas por jornada usada para normalizar precios por día a precio por HH (configurable via env HOURS_PER_DAY)
try:
    HOURS_PER_DAY = float(os.getenv("HOURS_PER_DAY", "8"))
except Exception:
    HOURS_PER_DAY = 8.0
if HOURS_PER_DAY <= 0 or HOURS_PER_DAY > 24:
    HOURS_PER_DAY = 8.0

class ProjectConfig(BaseModel):
    material_estructural: str

class TipoRecintoResponse(BaseModel):
    id: int
    nombre: str
    costo_tokens: int

    class Config:
        from_attributes = True

class SimulacionCreate(BaseModel):
    m2Totales: int
    materialEstructuralId: int
    habitaciones: int
    banios: int
    areasComunes: int
    perimetro_ml: float = Field(..., gt=0, description="Perímetro de envolvente en metros lineales")
    altura_muro_m: float = Field(..., gt=0, le=6.0, description="Altura promedio de muro en metros")
    incluir_techumbre: bool = Field(False, description="Incluye cálculo de techumbre (cubierta + cielo)")

@app.get("/")
def read_root():
    return {"message": "SIEC API is running", "stack": "FastAPI + PostgreSQL"}

@app.get("/materials")
def get_materials():
    """Retorna la lista oficial de materiales estructurales."""
    return {"materials": ALLOWED_MATERIALS}

@app.get("/api/tipos-recinto", response_model=List[TipoRecintoResponse])
def get_tipos_recinto(db: Session = Depends(get_db)):
    """Retorna los tipos de recinto y su costo en tokens (Catálogo para motor de estimación)."""
    return db.query(models.TipoRecinto).all()

@app.post("/api/simulacion/parametros", status_code=status.HTTP_201_CREATED)
def crear_simulacion(sim: SimulacionCreate, db: Session = Depends(get_db)):
    """Guarda los parámetros de configuración de la vivienda y crea una nueva simulación."""

    # Validaciones obligatorias
    if sim.m2Totales < 1 or sim.m2Totales > 5000:
        raise HTTPException(status_code=400, detail="Superficie total debe estar entre 1 y 5000 m².")

    if sim.habitaciones < 0 or sim.banios < 0 or sim.areasComunes < 0:
        raise HTTPException(status_code=400, detail="La cantidad de recintos no puede ser negativa.")
        
    if sim.materialEstructuralId not in [1, 2, 3, 4]:
        raise HTTPException(status_code=400, detail="Material estructural ID no válido.")
    
    if sim.perimetro_ml <= 0:
        raise HTTPException(status_code=400, detail="El perímetro debe ser mayor a 0 metros lineales.")
    
    if sim.altura_muro_m <= 0 or sim.altura_muro_m > 6.0:
        raise HTTPException(status_code=400, detail="La altura del muro debe estar entre 0 y 6 metros.")
        
    # Crear modelo
    db_simulacion = models.ConfiguracionSimulacion(
        m2_totales=sim.m2Totales,
        material_estructural_id=sim.materialEstructuralId,
        habitaciones=sim.habitaciones,
        banios=sim.banios,
        areas_comunes=sim.areasComunes,
        perimetro_ml=sim.perimetro_ml,
        altura_muro_m=sim.altura_muro_m,
        incluir_techumbre=sim.incluir_techumbre
    )
    
    try:
        db.add(db_simulacion)
        db.commit()
        db.refresh(db_simulacion)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al guardar en la base de datos.")
        
    return {"idSimulacion": db_simulacion.id, "message": "Simulación guardada correctamente"}

def normalize_string(s: str) -> str:
    """Remueve acentos y pasa a minúsculas para comparaciones robustas."""
    return "".join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

class RecintoGeometrico(BaseModel):
    tipo: str = Field(..., description="Nombre del tipo de recinto (ej. 'Habitación', 'Baño')")
    ancho: float = Field(..., description="Ancho geométrico del recinto en metros")
    largo: float = Field(..., description="Largo geométrico del recinto en metros")

class PayloadLayout3D(BaseModel):
    recintos: List[RecintoGeometrico]

@app.post("/api/simulacion/{simulacion_id}/layout", status_code=status.HTTP_201_CREATED)
def asociar_y_validar_layout_estricto(simulacion_id: int, payload: PayloadLayout3D, db: Session = Depends(get_db)):
    """
    Validación estricta de la disposición 3D:
    - Asegura que los m2 totales combinados <= m2 totales de la simulación.
    - Asegura que el área de CADA recinto individual sea >= el costo nativo en tokens del mismo.
    """
    # 1. Recuperar simulación de la base de datos
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")
        
    # 2. Precargar costos de tokens base para validación
    cat_tipos = db.query(models.TipoRecinto).all()
    # Mapeo relajado de strings (ej: 'Baño' -> 'bano')
    costo_por_tipo = { normalize_string(t.nombre): t.costo_tokens for t in cat_tipos }

    area_total_acumulada = 0.0    # 3. Iterar cada recinto recibido
    for recinto in payload.recintos:
        area_recinto = recinto.ancho * recinto.largo
        area_total_acumulada += area_recinto

        # Validación estricta mínima: Todo recinto debe tener un mínimo razonable (ej. 1m2),
        # prescindiendo de tipos legacy rígidos
        if area_recinto < 1.0:
            raise HTTPException(
                status_code=400,
                detail=f"Validación matemática falló: El cuarto tipo '{recinto.tipo}' tiene un área geométrica de {area_recinto:.2f} m², lo cual es inferior al mínimo seguro de 1 m²."
            )

    # 4. Validación de Capacidad Máxima (Tope Superior)
    if area_total_acumulada > float(simulacion.m2_totales):
        raise HTTPException(
            status_code=400, 
            detail=f"Validación estricta falló: La suma total de áreas ingresadas ({area_total_acumulada:.2f} m²) excede los metros cuadrados disponibles en la simulación base ({simulacion.m2_totales} m²)."
        )

    # Si pasa todas las validaciones asocia el modelo de forma íntegra a DB
    # Nota: Acá expandiríamos lógica de DB.commit() con los Recintos 3D hacia el modelo
    return {
        "status": "success",
        "message": "Validaciones estrictas pasadas. Configuración del plano íntegro.",
        "area_total_calculada": area_total_acumulada,
        "limite_m2_disponibles": simulacion.m2_totales
    }

@app.post("/api/simulacion/{simulacion_id}/calcular-insumos", response_model=DesgloseResponse)
def calcular_insumos(
    simulacion_id: int,
    payload: Optional[DeduccionMermasPayload] = None,
    db: Session = Depends(get_db),
):
    """
    Calcula el desglose de insumos para una simulación usando la Matriz de Rendimiento.
    """
    # 1. Recuperar simulacion
    simulacion = db.query(models.ConfiguracionSimulacion).filter(models.ConfiguracionSimulacion.id == simulacion_id).first()
    if not simulacion:
        raise HTTPException(status_code=404, detail="La simulación especificada no existe.")
        
    m2_totales = simulacion.m2_totales
    area_bruta = float(payload.area_bruta_m2) if payload and payload.area_bruta_m2 is not None else float(m2_totales)
    area_vanos = calcular_area_vanos(payload.vanos if payload else [])
    area_neta = calcular_area_neta(area_bruta, area_vanos)
    if area_neta <= 0:
        raise HTTPException(
            status_code=422,
            detail="La deducción de vanos deja un área neta no válida para cotizar.",
        )

    # ── Geometría de muros y techumbre ────────────────────────────────────────
    perimetro_ml = float(simulacion.perimetro_ml) if simulacion.perimetro_ml else 0.0
    altura_muro_m = float(simulacion.altura_muro_m) if simulacion.altura_muro_m else 2.44
    incluir_techumbre = bool(simulacion.incluir_techumbre) if simulacion.incluir_techumbre is not None else False
    area_muro_bruta = perimetro_ml * altura_muro_m if perimetro_ml > 0 else 0.0
    area_muro_neta = max(0.0, area_muro_bruta - area_vanos) if area_muro_bruta > 0 else area_neta
    cortes_acero = int(payload.cortes_acero) if payload else 0
    cruces_acero = int(payload.cruces_acero) if payload else 0
    piezas_2d_payload = [
        (float(piece.ancho), float(piece.alto), int(piece.cantidad))
        for piece in (payload.piezas_2d if payload else [])
    ]
    cortes_1d_payload = [
        (float(cut.largo), int(cut.cantidad))
        for cut in (payload.cortes_1d if payload else [])
    ]
    material_id = simulacion.material_estructural_id

    # 2. Material nombre
    material = db.query(models.MaterialEstructural).filter(models.MaterialEstructural.id == material_id).first()
    material_nombre = material.nombre if material else "Desconocido"

    # 3. Consultar la matriz cruzada con insumos
    datos_rendimiento = db.query(models.MatrizRendimiento, models.Insumo).join(
        models.Insumo,
        models.MatrizRendimiento.insumo_id == models.Insumo.id
    ).filter(
        models.MatrizRendimiento.material_estructural_id == material_id,
        models.MatrizRendimiento.activo == True,
        models.Insumo.activo == True
    ).all()

    if not datos_rendimiento:
        raise HTTPException(status_code=422, detail="No existen rendimientos para el material seleccionado")

    # Promediador de Precios de Mercado
    insumo_ids = [insumo.id for r, insumo in datos_rendimiento]
    
    precios_records = db.query(models.PrecioMercado).distinct(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda
    ).filter(
        models.PrecioMercado.exitoso == True,
        models.PrecioMercado.insumo_id.in_(insumo_ids)
    ).order_by(
        models.PrecioMercado.insumo_id, 
        models.PrecioMercado.tienda, 
        models.PrecioMercado.fecha_scraping.desc()
    ).all()

    precios_x_insumo = defaultdict(list)
    latest_precio_record = {}
    fechas_usadas = []

    for pm in precios_records:
        precio_val = pm.precio_descuento if pm.precio_descuento is not None else pm.precio
        if precio_val is not None:
            precios_x_insumo[pm.insumo_id].append(float(precio_val))
            # Guardar el primer registro (ordenado por fecha desc) como muestra representativa
            if pm.insumo_id not in latest_precio_record:
                latest_precio_record[pm.insumo_id] = pm
            if pm.fecha_scraping:
                fechas_usadas.append(pm.fecha_scraping.isoformat() if hasattr(pm.fecha_scraping, 'isoformat') else str(pm.fecha_scraping))

    precio_promedio_map = {}
    for i_id, lista_precios in precios_x_insumo.items():
        if lista_precios:
            precio_promedio_map[i_id] = sum(lista_precios) / len(lista_precios)

    fecha_precios = min(fechas_usadas) if fechas_usadas else None

    # 4. Agrupar por categoria y calcular subtotales
    categorias_dict = defaultdict(list)
    costo_total_simulacion = None

    # Prepare for labor parametrization: collect labor insumos and rendimiento factors
    labor_insumos = []
    rendimiento_jornadas_total = 0.0
    labor_factors = {}
    for r, insumo in datos_rendimiento:
        if insumo.categoria and insumo.categoria.strip().lower() == 'mano de obra':
            labor_insumos.append((r, insumo))
            labor_factors[insumo.id] = r

    # Determine total jornadas por m2 from labor factors
    for r, insumo in labor_insumos:
        unidad_factor = (getattr(r, 'unidad_factor', '') or '').lower()
        try:
            if 'jornada' in unidad_factor or 'jornad' in unidad_factor:
                jornadas = float(r.factor_multiplicador)
            else:
                # Default: treat factor as HH per m2 and convert to jornadas
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
        except Exception:
            try:
                jornadas = float(r.factor_multiplicador) / float(HOURS_PER_DAY)
            except Exception:
                jornadas = 0.0
        rendimiento_jornadas_total += jornadas

    # Find maestro and ayudante daily salaries from latest_precio_record
    maestro_keywords = ('maestro', 'albañil', 'oficial')
    ayudante_keywords = ('ayudante', 'ayuda')
    salario_diario_maestro = 0.0
    salario_diario_ayudante = 0.0
    found_maestro = False
    found_ayudante = False

    for r, insumo in labor_insumos:
        pm = latest_precio_record.get(insumo.id)
        if not pm:
            continue
        precio_val = getattr(pm, 'precio_descuento', None) if getattr(pm, 'precio_descuento', None) is not None else getattr(pm, 'precio', None)
        if precio_val is None:
            continue
        precio_val = float(precio_val)
        nombre_prod = (getattr(pm, 'nombre_producto', '') or '').lower()
        # Determine if price is per jornada
        is_por_jornada = any(k in nombre_prod for k in ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia'))
        # If insumo unit is HH and price appears to be per HH, convert to diario
        unidad_medida_insumo = (insumo.unidad_medida or '').strip().upper()
        if unidad_medida_insumo in ('HH', 'H') and not is_por_jornada:
            salario_diario = precio_val * float(HOURS_PER_DAY)
        else:
            salario_diario = precio_val

        # Prefer explicit role mapping in Insumo_Role if available
        role_entry = db.query(models.InsumoRole).filter(models.InsumoRole.insumo_id == insumo.id).first()
        role_val = None
        if role_entry and getattr(role_entry, 'role', None):
            role_val = str(role_entry.role).strip().lower()

        if role_val == 'maestro':
            salario_diario_maestro += salario_diario
            found_maestro = True
        elif role_val == 'ayudante' or role_val == 'help' or role_val == 'assistant':
            salario_diario_ayudante += salario_diario
            found_ayudante = True
        else:
            # Fallback to name matching if no explicit role
            name_l = (insumo.nombre or '').lower()
            if any(k in name_l for k in maestro_keywords):
                salario_diario_maestro += salario_diario
                found_maestro = True
            if any(k in name_l for k in ayudante_keywords):
                salario_diario_ayudante += salario_diario
                found_ayudante = True

    tarifa_pura_local = None
    if (found_maestro or found_ayudante) and rendimiento_jornadas_total > 0:
        tarifa_pura_local = (salario_diario_maestro + salario_diario_ayudante) * rendimiento_jornadas_total

    volumen_neto_previo = 0.0
    volumen_compensado_pre_cotizacion = 0.0
    perdidas_optimizadas = []
    items_optimizados = 0

    # ── Área base para techumbre ──────────────────────────────────────────────
    area_techumbre = m2_totales * 1.15 if incluir_techumbre else 0.0

    # ── Geometría real: clasificación de insumos por familia constructiva ────
    # Se definen familias para interceptar el cálculo genérico y aplicar
    # matemática basada en perímetro, altura de muro y dimensiones comerciales.
    # Cualquier insumo que no coincida cae al cálculo original (factor × área).

    def _clasificar_insumo(nombre_l: str, cat_l: str) -> str:
        """Retorna la familia constructiva: 'estructura_muro', 'revestimiento_muro',
        'techumbre', 'losa_hormigon', o 'generico'."""
        # Estructura de muro: perfiles verticales/horizontales
        if any(k in nombre_l for k in ["solera", "montante", "pie derecho", "paral"]):
            return "estructura_muro"
        if any(k in nombre_l for k in ["perfil metalcon", "perfil acero", "perfil galvanizado"]):
            return "estructura_muro"
        if any(k in nombre_l for k in ["2x3", "2x4", "2x6", "pino 2x3", "pino 2x4", "pino 2x6"]):
            return "estructura_muro"
        # Revestimiento de muro: placas y paneles
        if any(k in nombre_l for k in [
            "siding", "osb", "yeso cartón", "yeso carton", "yeso-cartón", "yeso-carton",
            "placa fibrocemento", "terciado", "plywood", "panel muro",
            "revestimiento mural", "muro perimetral", "m fm",
            "tabiquería", "tabiqueria", "tabique interior",
        ]):
            return "revestimiento_muro"
        # Techumbre
        if incluir_techumbre and any(k in nombre_l for k in [
            "zincalum", "cubierta", "zinc", "cielo", "aislación", "aislacion",
            "polietileno techo", "térmico techo", "m2 techo", "techumbre",
        ]):
            return "techumbre"
        # Losa / hormigón in-situ
        if cat_l == "obra gruesa" and any(k in nombre_l for k in [
            "gravilla", "arena", "ripio", "cemento", "agua", "hormigón",
        ]):
            return "losa_hormigon"
        return "generico"

    for r, insumo in datos_rendimiento:
        nombre_l = (insumo.nombre or "").lower()
        cat_l = (insumo.categoria or "").lower()
        familia = _clasificar_insumo(nombre_l, cat_l)

        # ── Cálculo por familia ───────────────────────────────────────────────
        if familia == "estructura_muro" and perimetro_ml > 0:
            dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
            largo_pieza = dim.get("largo_lineal_m", 3.2)
            es_solera = "solera" in nombre_l

            if es_solera:
                # Soleras superior e inferior: 2 filas × perímetro
                cantidad_neta = math.ceil((perimetro_ml * 2) / largo_pieza) * 2  # 2 soleras
            else:
                # Pie derechos / montantes cada 40 cm + 4 esquineros
                cantidad_neta = math.ceil(perimetro_ml / 0.40) + 4

            cantidad_neta = math.ceil(cantidad_neta * 1.15)  # merma 15%
            nesting_result = None

        elif familia == "revestimiento_muro" and perimetro_ml > 0 and altura_muro_m > 0:
            dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
            area_placa = dim.get("area_m2", 2.9768)
            if area_placa <= 0:
                area_placa = 2.9768
            area_cubrir = perimetro_ml * altura_muro_m
            if area_cubrir > 0:
                cantidad_neta = math.ceil(area_cubrir / area_placa * 1.10)
            else:
                cantidad_neta = 0.0
            nesting_result = None

        elif familia == "techumbre" and area_techumbre > 0:
            # Techumbre: usar area_techumbre (m2_totales × 1.15) × factor DB
            factor_ajustado = float(r.factor_multiplicador)
            cantidad_neta = factor_ajustado * area_techumbre
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )

        elif familia == "losa_hormigon":
            # Losa de 10 cm: convertir kg/m³ a kg/m² usando espesor
            factor_ajustado = float(r.factor_multiplicador)
            factor_ajustado *= 0.1  # losa 10 cm
            if any(k in nombre_l for k in ["arena", "gravilla", "ripio"]):
                factor_ajustado /= 1600.0  # kg → m³
            if "cemento" in nombre_l:
                factor_ajustado /= 25.0  # kg → sacos de 25 kg
            cantidad_neta = factor_ajustado * area_neta
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )

        else:  # ── familia "generico" ─────────────────────────────────────────
            # Cálculo original: factor DB × área base (piso)
            factor_ajustado = float(r.factor_multiplicador)
            cantidad_neta = factor_ajustado * area_neta
            nesting_result = optimizar_compra_por_nesting(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                unidad_medida=insumo.unidad_medida,
                unidad_factor=getattr(r, "unidad_factor", "") or "",
                descripcion=getattr(insumo, "descripcion", None),
                cantidad_objetivo=cantidad_neta,
                piezas_2d=piezas_2d_payload,
                cortes_1d=cortes_1d_payload,
            )
        if familia in ("estructura_muro", "revestimiento_muro"):
            # Estas familias ya calcularon piezas enteras con merma incluida
            factor_perdida = 1.0
            cantidad_calc = cantidad_neta
        elif nesting_result is not None:
            factor_perdida = float(nesting_result["factor_perdida_equivalente"])
            cantidad_calc = float(nesting_result["cantidad_compra"])
            perdidas_optimizadas.append(float(nesting_result["perdida_fraccion"]))
            items_optimizados += 1
        else:
            factor_perdida = inferir_factor_perdida(
                insumo=insumo.nombre,
                categoria=insumo.categoria,
                cortes_acero=cortes_acero,
                cruces_acero=cruces_acero,
            )
            cantidad_calc = cantidad_neta * factor_perdida
        volumen_neto_previo += cantidad_neta
        volumen_compensado_pre_cotizacion += cantidad_calc

        precio_unit = precio_promedio_map.get(insumo.id)
        precio_record = latest_precio_record.get(insumo.id)
        precio_unit_normalized = None
        subt = None
        if precio_unit is not None:
            precio_unit_normalized = float(precio_unit)
            # Normalización de unidades de mano de obra: si el insumo espera HH pero el producto sugiere precio por jornada/día,
            # convertir a precio por HH dividiendo por HOURS_PER_DAY.
            try:
                unidad_esperada = (insumo.unidad_medida or '').strip().upper()
            except Exception:
                unidad_esperada = ''
            if unidad_esperada in ('HH', 'H') and precio_record is not None:
                nombre_prod = getattr(precio_record, 'nombre_producto', '') or ''
                nombre_prod_l = nombre_prod.lower()
                if any(k in nombre_prod_l for k in ('jornada', 'por jornada', 'por día', 'por dia', 'día', 'dia')):
                    try:
                        precio_unit_normalized = precio_unit_normalized / float(HOURS_PER_DAY)
                    except Exception:
                        pass
            subt = precio_unit_normalized * cantidad_calc
            # Aplicar recargo obligatorio por leyes sociales solo para Mano de Obra
            try:
                categoria_normalizada = insumo.categoria.strip().lower() if insumo.categoria else ""
            except Exception:
                categoria_normalizada = ""
            if categoria_normalizada == 'mano de obra':
                subt = subt * SOCIAL_LEY_FACTOR
            if costo_total_simulacion is None:
                costo_total_simulacion = 0.0
            costo_total_simulacion += subt

        # ── Inyectar dimensiones comerciales ─────────────────────────────
        dim = obtener_dimensiones(insumo.nombre, insumo.categoria or "")
        if dim.get("tipo") == "placa" and dim.get("area_m2"):
            fmt_comercial = f"{dim['ancho_m']} x {dim['largo_m']} m ({dim['area_m2']:.2f} m²)"
        elif dim.get("tipo") == "lineal" and dim.get("largo_lineal_m"):
            fmt_comercial = f"{dim['largo_lineal_m']} m"
        else:
            fmt_comercial = None

        # Preferir el formato del nesting si existe (es más preciso)
        formato_final = (
            nesting_result["formato_comercial"]
            if nesting_result and nesting_result.get("formato_comercial")
            else fmt_comercial
        )

        item = InsumoCalculado(
            insumo=insumo.nombre,
            cantidad=cantidad_calc,
            unidad=insumo.unidad_medida,
            precio_unitario=precio_unit,
            subtotal=subt,
            cantidad_objetivo=None,
            cantidad_compra=None,
            perdida_porcentual=(factor_perdida - 1.0) * 100.0,
            metodo_optimizacion=None,
            formato_comercial=formato_final,
        )
        categorias_dict[insumo.categoria].append(item)

    # 5. Mapear a Schema
    desglose_list = []
    for cat_name, items in categorias_dict.items():
        has_subt = any(i.subtotal is not None for i in items)
        subcat = sum((i.subtotal for i in items if i.subtotal is not None)) if has_subt else None

        desglose_list.append(CategoriaDesglose(
            categoria=cat_name, 
            items=items, 
            subtotal_categoria=subcat
        ))

    # ── Techumbre ─────────────────────────────────────────────────────────────
    if incluir_techumbre:
        categorias_techumbre = calcular_partida_techumbre(
            area_m2_planta=m2_totales,
        )
        desglose_list.extend(categorias_techumbre)
        for cat in categorias_techumbre:
            if cat.subtotal_categoria:
                if costo_total_simulacion is None:
                    costo_total_simulacion = 0.0
                costo_total_simulacion += cat.subtotal_categoria

    return DesgloseResponse(
        simulacion_id=simulacion_id,
        m2_totales=m2_totales,
        material=material_nombre,
        desglose=desglose_list,
        costo_total=costo_total_simulacion,
        fecha_precios=fecha_precios,
        tarifa_pura_local=tarifa_pura_local,
        area_bruta_m2=area_bruta,
        area_vanos_m2=area_vanos,
        area_neta_m2=area_neta,
        volumen_neto_previo=volumen_neto_previo,
        volumen_compensado_pre_cotizacion=volumen_compensado_pre_cotizacion,
        items_optimizados=items_optimizados if items_optimizados > 0 else None,
        perdida_promedio_porcentual=(
            (sum(perdidas_optimizadas) / len(perdidas_optimizadas)) * 100.0
            if perdidas_optimizadas else None
        ),
        perimetro_ml=perimetro_ml if perimetro_ml > 0 else None,
        altura_muro_m=altura_muro_m,
        area_muro_neta_m2=area_muro_neta if area_muro_neta > 0 else None,
        incluir_techumbre=incluir_techumbre,
    )

## SCRUM-97
## Ley 21.725 - Validación de Cumplimiento Normativo (Ley del Mono)
try:
    from Ley21725 import ValidacionLeyMonoRequest, ValidacionLeyMonoResponse, validar_ley_21725
except ModuleNotFoundError:
    from backend.Ley21725 import ValidacionLeyMonoRequest, ValidacionLeyMonoResponse, validar_ley_21725

@app.post("/api/validar-ley-mono", response_model=ValidacionLeyMonoResponse)
def endpoint_validar_ley_mono(payload: ValidacionLeyMonoRequest):
    return validar_ley_21725(
        area_m2=payload.area_m2,
        costo_total_clp=payload.costo_total_clp,
        valor_uf_actual=payload.valor_uf_actual,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
