import pytest
from unittest.mock import MagicMock
import sys
import os
from datetime import datetime

# Añadir el raíz del backend para importar módulos y app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import calcular_insumos, DesgloseResponse
import models

def test_promedio_precios_logic():
    """
    Prueba el algoritmo promediador con 3 tiendas, 1 tienda y 0 tiendas disponibles
    usando unit testing con mocks sobre las funciones de SQLAlchemy DB query.
    """
    mock_db = MagicMock()
    
    # ConfiguracionSimulacion Mock (100 m2 totales)
    mock_sim = MagicMock()
    mock_sim.m2_totales = 100
    mock_sim.material_estructural_id = 1
    mock_sim.perimetro_ml = None
    mock_sim.altura_muro_m = None
    mock_sim.incluir_techumbre = False
    
    # MaterialEstructural Mock
    mock_mat = MagicMock()
    mock_mat.nombre = "Albañilería de Prueba"
    
    # --- INSUMOS MOCKS ---
    # 1: Tiene precios en 3 tiendas (Sodimac 5000, Easy 5200, Construmart 4800) -> Promedio 5000
    mock_insumo_1 = MagicMock()
    mock_insumo_1.id = 1
    mock_insumo_1.nombre = "Cemento Especial"
    mock_insumo_1.categoria = "Obra Gruesa"
    mock_insumo_1.unidad_medida = "saco 25kg"
    
    # 2: Tiene precio en 1 tienda (Sodimac 1200) -> Promedio 1200
    mock_insumo_2 = MagicMock()
    mock_insumo_2.id = 2
    mock_insumo_2.nombre = "Ladrillo Fisico"
    mock_insumo_2.categoria = "Obra Gruesa"
    mock_insumo_2.unidad_medida = "unidad"
    
    # 3: No tiene precios
    mock_insumo_3 = MagicMock()
    mock_insumo_3.id = 3
    mock_insumo_3.nombre = "Clavo Volcanita"
    mock_insumo_3.categoria = "Obra Gruesa"
    mock_insumo_3.unidad_medida = "caja"
    
    # --- RENDIMIENTOS MOCKS ---
    # Factores:
    # Insumo 1: 0.5 por m2 (Total 50.0 sacos)
    mock_r1 = MagicMock(); mock_r1.factor_multiplicador = 0.5
    # Insumo 2: 10 por m2 (Total 1000 unidades)
    mock_r2 = MagicMock(); mock_r2.factor_multiplicador = 10.0
    # Insumo 3: 0.1 por m2 (Total 10 cajas)
    mock_r3 = MagicMock(); mock_r3.factor_multiplicador = 0.1
    
    # --- PRECIO MERCADO RECENTS MOCKS ---
    dt1 = datetime(2026, 4, 15, 10, 0, 0)
    
    # Para Insumo 1 (3 tiendas)
    # Notemos que en main.py priorizamos precio_descuento si existe.
    pm1 = MagicMock(insumo_id=1, tienda="sodimac", precio=5000.0, precio_descuento=None, fecha_scraping=dt1, url="http://a")
    pm2 = MagicMock(insumo_id=1, tienda="easy", precio=5500.0, precio_descuento=5200.0, fecha_scraping=dt1, url="http://b")
    pm3 = MagicMock(insumo_id=1, tienda="construmart", precio=4800.0, precio_descuento=None, fecha_scraping=dt1, url="http://c")
    
    # Para Insumo 2 (1 tienda)
    pm4 = MagicMock(insumo_id=2, tienda="sodimac", precio=1200.0, precio_descuento=1200.0, fecha_scraping=dt1, url="http://d")
    
    # Mocking chain behaviour for db.query
    def side_effect(model_arg, *args):
        query_mock = MagicMock()
        
        if model_arg == models.ConfiguracionSimulacion:
            query_mock.filter.return_value.first.return_value = mock_sim
        elif model_arg == models.MaterialEstructural:
            query_mock.filter.return_value.first.return_value = mock_mat
        elif isinstance(model_arg, type) and model_arg == models.PrecioMercado:
            # db.query(models.PrecioMercado).distinct().filter().order_by().all()
            query_mock.distinct.return_value.filter.return_value.order_by.return_value.all.return_value = [pm1, pm2, pm3, pm4]
        else:
            # db.query(models.MatrizRendimiento, models.Insumo).join().filter().all()
            query_mock.join.return_value.filter.return_value.all.return_value = [
                (mock_r1, mock_insumo_1),
                (mock_r2, mock_insumo_2),
                (mock_r3, mock_insumo_3)
            ]
            
        return query_mock

    mock_db.query.side_effect = side_effect
    
    # Ejectua el endpoint
    response = calcular_insumos(simulacion_id=1, db=mock_db)
    
    # Verificaciones
    # Evitar comprobación de isinstance frágil entre cargas de módulos; comprobar estructura esperada
    assert hasattr(response, 'desglose')
    
    items = response.desglose[0].items
    assert len(items) == 3
    
    # Insumo 1: Cemento (3 tiendas) — con multi-tienda, usa el mejor precio (Construmart 4800)
    # factor bruto 0.5/m2; main aplica corrección obra gruesa (*0.1 volumen losa)
    # y conversión kg→sacos de 25kg (/25): 0.5 * 0.1 / 25 * 100 m2 = 0.2 sacos * 4800
    assert items[0].insumo == "Cemento Especial"
    assert items[0].precio_unitario == 4800.0
    assert items[0].subtotal == 960.0
    
    # Insumo 2: Ladrillo (1 tienda)
    # 1000 unidades * factor pérdida 1.05 * 1200
    assert items[1].insumo == "Ladrillo Fisico"
    assert items[1].precio_unitario == 1200.0
    assert items[1].subtotal == 1260000.0
    
    # Insumo 3: Clavos (No precios)
    # Null handling check
    assert items[2].insumo == "Clavo Volcanita"
    assert items[2].precio_unitario is None
    assert items[2].subtotal is None
    
    # Totales Finales incluyen complementos constructivos referenciales de muro.
    assert response.costo_total == 1390500.0
    assert response.fecha_precios == dt1.isoformat()
    assert response.desglose[0].subtotal_categoria == 1261000.0
