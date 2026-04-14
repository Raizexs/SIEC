#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRUM-59: Script de Validación Pre-Docker Compose
Verifica que todos los cambios estén en lugar correcto antes de ejecutar docker-compose
"""

import os
import sys
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def check_file_exists(path: str, description: str) -> bool:
    """Verifica si un archivo existe"""
    if os.path.exists(path):
        print(f"{Colors.GREEN}✅{Colors.RESET} {description}")
        return True
    else:
        print(f"{Colors.RED}❌{Colors.RESET} {description} - NO ENCONTRADO")
        return False

def check_file_contains(path: str, pattern: str, description: str) -> bool:
    """Verifica si un archivo contiene un patrón específico"""
    if not os.path.exists(path):
        print(f"{Colors.RED}❌{Colors.RESET} {description} - ARCHIVO NO EXISTE")
        return False
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            if pattern in content:
                print(f"{Colors.GREEN}✅{Colors.RESET} {description}")
                return True
            else:
                print(f"{Colors.RED}❌{Colors.RESET} {description} - PATRÓN NO ENCONTRADO")
                return False
    except Exception as e:
        print(f"{Colors.RED}❌{Colors.RESET} {description} - ERROR: {str(e)}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
    print(f"{Colors.BLUE}SCRUM-59: Script de Validación Pre-Docker Compose{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")
    
    checks = []
    
    # 1. Validar Migraciones SQL
    print(f"{Colors.BLUE}1. Validando Migraciones SQL...{Colors.RESET}")
    checks.append(check_file_exists(
        "database/migrations/003_create_motor_costos.sql",
        "Migración 003_create_motor_costos.sql"
    ))
    checks.append(check_file_contains(
        "database/migrations/003_create_motor_costos.sql",
        "CREATE TABLE IF NOT EXISTS material_estructural",
        "Tabla material_estructural en migración"
    ))
    checks.append(check_file_contains(
        "database/migrations/003_create_motor_costos.sql",
        "CREATE TABLE IF NOT EXISTS insumo",
        "Tabla insumo en migración"
    ))
    checks.append(check_file_contains(
        "database/migrations/003_create_motor_costos.sql",
        "CREATE TABLE IF NOT EXISTS matriz_rendimiento",
        "Tabla matriz_rendimiento en migración"
    ))
    checks.append(check_file_contains(
        "database/migrations/003_create_motor_costos.sql",
        "CREATE TABLE IF NOT EXISTS precio_mercado",
        "Tabla precio_mercado en migración"
    ))
    
    # 2. Validar Seeds
    print(f"\n{Colors.BLUE}2. Validando Seeds...{Colors.RESET}")
    checks.append(check_file_exists(
        "database/seeds/004_seed_material_estructural.sql",
        "Seed de materiales estructurales"
    ))
    checks.append(check_file_contains(
        "database/seeds/004_seed_material_estructural.sql",
        "ON CONFLICT (nombre) DO NOTHING",
        "Seed con ON CONFLICT para evitar duplicados"
    ))
    checks.append(check_file_exists(
        "database/seeds/004_verify_material_estructural.sql",
        "Verificación de seeds de materiales"
    ))
    
    # 3. Validar Modelos SQLAlchemy
    print(f"\n{Colors.BLUE}3. Validando Modelos SQLAlchemy...{Colors.RESET}")
    checks.append(check_file_contains(
        "backend/models.py",
        "class MaterialEstructural(Base):",
        "Modelo MaterialEstructural"
    ))
    checks.append(check_file_contains(
        "backend/models.py",
        "class Insumo(Base):",
        "Modelo Insumo"
    ))
    checks.append(check_file_contains(
        "backend/models.py",
        "class MatrizRendimiento(Base):",
        "Modelo MatrizRendimiento"
    ))
    checks.append(check_file_contains(
        "backend/models.py",
        "class PrecioMercado(Base):",
        "Modelo PrecioMercado"
    ))
    checks.append(check_file_contains(
        "backend/models.py",
        "from sqlalchemy.orm import relationship",
        "Import de relationship en models.py"
    ))
    
    # 4. Validar main.py
    print(f"\n{Colors.BLUE}4. Validando Actualizaciones en main.py...{Colors.RESET}")
    checks.append(check_file_contains(
        "backend/main.py",
        "def get_allowed_materials(db: Session)",
        "Función get_allowed_materials"
    ))
    checks.append(check_file_contains(
        "backend/main.py",
        "models.MaterialEstructural(nombre=",
        "Seed de MaterialEstructural en startup"
    ))
    checks.append(check_file_contains(
        "backend/main.py",
        "db.query(models.MaterialEstructural)",
        "Consulta a tabla MaterialEstructural"
    ))
    checks.append(check_file_contains(
        "backend/main.py",
        'if db.query(models.MaterialEstructural).count() == 0:',
        "Validación de duplicación en startup"
    ))
    
    # 5. Validar init-db.sh
    print(f"\n{Colors.BLUE}5. Validando init-db.sh...{Colors.RESET}")
    checks.append(check_file_contains(
        "database/init-db.sh",
        "003_create_motor_costos.sql",
        "Ejecución de migración 003 en init-db.sh"
    ))
    
    # 6. Validar que no exista ALLOWED_MATERIALS hardcodeada
    print(f"\n{Colors.BLUE}6. Validando que ALLOWED_MATERIALS fue removida...{Colors.RESET}")
    if not check_file_contains(
        "backend/main.py",
        'ALLOWED_MATERIALS = ["Madera"',
        "ALLOWED_MATERIALS hardcodeada DEBE ESTAR REMOVIDA"
    ):
        checks.append(True)  # Pasó porque NO la encontró
        print(f"{Colors.GREEN}✅{Colors.RESET} ALLOWED_MATERIALS hardcodeada no existe (correcto)")
    
    # Resumen
    print(f"\n{Colors.BLUE}{'='*80}{Colors.RESET}")
    total = len(checks)
    passed = sum(1 for c in checks if c)
    failed = total - passed
    
    if failed == 0:
        print(f"{Colors.GREEN}✅ TODAS LAS VALIDACIONES PASARON ({passed}/{total}){Colors.RESET}")
        print(f"{Colors.GREEN}Estado: LISTO PARA docker-compose up --build{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")
        return 0
    else:
        print(f"{Colors.RED}❌ ALGUNAS VALIDACIONES FALLARON ({passed}/{total} pasadas){Colors.RESET}")
        print(f"{Colors.YELLOW}Por favor revisa los archivos indicados arriba{Colors.RESET}")
        print(f"{Colors.BLUE}{'='*80}{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
