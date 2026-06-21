# SIEC — Sistema Inteligente de Estimación en Construcción

![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=three.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![Status](https://img.shields.io/badge/Status-Beta-orange)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-lightgrey)

SIEC es una plataforma web para estimación inteligente en construcción, planificación espacial 2D/3D, análisis de materiales, gestión de layouts y analítica de portafolios de proyectos.

La plataforma está diseñada para ayudar a equipos de construcción, arquitectura e ingeniería a modelar espacios, validar áreas disponibles, visualizar proyectos en tiempo real y apoyar flujos de estimación de costos mediante una interfaz moderna estilo SaaS.

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Funciones Principales](#funciones-principales)
- [Módulos del Producto](#módulos-del-producto)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Inicio Rápido](#inicio-rápido)
- [Estado del Proyecto](#estado-del-proyecto)
- [Roadmap](#roadmap)
- [Equipo](#equipo)
- [Licencia](#licencia)

## Descripción General

SIEC combina un editor de espacios en 2D, un visor 3D en tiempo real, validación de áreas, configuración de materiales, dashboards de proyectos y SIEC Place en un único flujo de trabajo para estimación en construcción.

El sistema se enfoca en transformar decisiones espaciales en etapas tempranas en datos medibles del proyecto. Los usuarios pueden crear espacios, aplicar layouts base, revisar áreas disponibles, visualizar el proyecto en 3D y preparar la base para estimaciones de costos y reportes técnicos.

## Funciones Principales

### Diseño y Simulación

- Editor 2D para planificación espacial.
- Visualización 3D en tiempo real impulsada por WebGL.
- Creación, redimensionamiento y posicionamiento de espacios.
- Plantillas base y layouts guardados.
- Validación de uso de superficies y control de área disponible.

### Estimación y Análisis

- Configuración de proyectos basada en materiales.
- Flujo de estimación de costos de construcción.
- Desglose de proyectos orientado a presupuestos.
- Dashboard de proyectos y simulaciones guardadas.
- **SIEC Place**: marketplace de obras para publicar presupuestos y conectar con contratistas (plan Pro+).

### Experiencia del Producto

- Dashboard premium y entorno de trabajo moderno.
- Preferencias de producto para editor, estimación y exportación.
- Soporte para modo oscuro.
- Autenticación y configuración de cuentas cuando esté habilitado.
- Arquitectura frontend modular basada en vistas, componentes, stores y composables.

## Módulos del Producto

| Módulo      | Propósito                                                                    |
| ----------- | ---------------------------------------------------------------------------- |
| Workspace   | Entorno principal de simulación 2D/3D para construcción.                     |
| Dashboard   | Acceso, gestión rápida y visión general de proyectos.                        |
| Analytics   | Insights a nivel de portafolio, distribución de costos, riesgos y actividad. |
| Settings    | Cuenta, seguridad, preferencias, integraciones y plan contratado.            |
| Backend API | Lógica de negocio, acceso a datos y capa de integración de servicios.        |
| Database    | Persistencia relacional de datos estructurados del sistema y proyectos.      |
| Scraper     | Módulo de recopilación y normalización de precios, cuando está habilitado.   |

## Stack Tecnológico

| Área              | Tecnología               |
| ----------------- | ------------------------ |
| Frontend          | Vue 3, Vite, TailwindCSS |
| Gestión de Estado | Pinia                    |
| Routing           | Vue Router               |
| Renderizado 3D    | Three.js                 |
| Backend           | FastAPI                  |
| Base de Datos     | PostgreSQL               |
| Autenticación     | Supabase                 |
| Infraestructura   | Docker, Vercel, Railway  |
| Iconos UI         | Lucide Icons             |

## Arquitectura

```text
Frontend Vue/Vite
    -> FastAPI Backend
        -> PostgreSQL

Frontend Vue/Vite
    -> Supabase Auth, when configured

Scraper
    -> PostgreSQL
```

SIEC sigue una arquitectura modular donde el frontend maneja el editor interactivo, la visualización, dashboards, analítica y configuración. El backend es responsable de la lógica API y flujos de datos. PostgreSQL soporta la persistencia estructurada, mientras que el módulo scraper puede utilizarse para preparar o actualizar información de precios externos.

## Estructura del Repositorio

```text
SIEC/
├── frontend/
├── backend/
├── database/
├── scraper/
├── docs/
├── poc/
├── docker-compose.yml
├── railway.toml
├── vercel.json
├── package.json
└── README.md
```

## Inicio Rápido

### Clonar el repositorio

```bash
git clone https://github.com/Raizexs/SIEC.git
cd SIEC
```

### Ejecutar con Docker

```bash
docker-compose up --build
```

### Ejecutar el frontend manualmente

```bash
cd frontend
npm install
npm run dev
```

### Ejecutar el backend manualmente

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

La configuración de entorno depende del módulo que se esté ejecutando.

## Estado del Proyecto

SIEC se encuentra actualmente en etapa beta / prototipo avanzado.

La experiencia principal del producto, incluyendo el workspace, flujo de layouts, editor visual, dashboard de proyectos, analítica y configuración, está en desarrollo activo. Algunas integraciones, exportaciones y fuentes externas de precios aún pueden evolucionar.

## Roadmap

### Corto Plazo

- Conectar preferencias del producto directamente al editor y flujo de estimación.
- Mejorar exportaciones PDF, IFC y GLB.
- Refinar plantillas base y gestión de layouts guardados.
- Fortalecer QA visual en modos oscuro y claro.

### Mediano Plazo

- Integrar APIs reales de precios y fuentes estructuradas de costos.
- Agregar reportes comerciales personalizables.
- Mejorar historial de versiones y recuperación de proyectos.
- Expandir analítica y detección de riesgos.

### Largo Plazo

- Integración BIM avanzada.
- Colaboración multiusuario.
- Sincronización en la nube.
- Análisis predictivo de costos.

## Equipo

- Andres Tapia — Product Manager
- Lukas Flores — Technical Lead
- Gonzalo Jara — Scrum Master
- Felipe Figueroa — Developer
- Fernando Salazar — Developer

## Licencia

Todos los derechos reservados.

Este proyecto es propietario. Ninguna parte de este repositorio puede ser copiada, modificada, distribuida, sublicenciada o utilizada con fines comerciales sin autorización previa por escrito de los propietarios del proyecto.

Copyright (c) 2026 SIEC Team.
