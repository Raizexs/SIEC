# SIEC — Intelligent Construction Estimation System

![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=three.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
![Status](https://img.shields.io/badge/Status-Beta-orange)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-lightgrey)

SIEC is a web platform for intelligent construction estimation, 2D/3D spatial planning, material analysis, layout management, and project portfolio analytics.

The platform is designed to help construction, architecture, and engineering teams model spaces, validate available area, visualize projects in real time, and support cost estimation workflows through a modern SaaS-style interface.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Product Modules](#product-modules)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Project Status](#project-status)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

## Overview

SIEC combines a 2D room editor, a real-time 3D viewer, area validation, material configuration, project dashboards, and SIEC Place into a single construction estimation workflow.

The system focuses on turning early-stage spatial decisions into measurable project data. Users can create rooms, apply base layouts, review available area, visualize the project in 3D, and prepare the foundation for cost estimation and technical reporting.

## Core Features

### Design and Simulation

- 2D room editor for spatial planning.
- Real-time 3D visualization powered by WebGL.
- Room creation, resizing, positioning, and layout management.
- Base templates and saved layouts.
- Surface usage validation and available area tracking.

### Estimation and Analysis

- Material-based project configuration.
- Construction cost estimation workflow.
- Budget-oriented project breakdowns.
- Project dashboard for saved simulations.
- **SIEC Place**: project marketplace to publish budgets and connect with contractors (Pro+ plan).

### Product Experience

- Premium dashboard and workspace interface.
- Product preferences for editor, estimation, and export behavior.
- Dark mode support.
- Authentication and account settings when configured.
- Modular frontend architecture based on views, components, stores, and composables.

## Product Modules

| Module | Purpose |
| --- | --- |
| Workspace | Main 2D/3D construction simulation environment. |
| Dashboard | Project access, overview, and quick project management. |
| Analytics | Portfolio-level insights, cost distribution, risks, and activity. |
| Settings | Account, security, product preferences, integrations, and plan overview. |
| Backend API | Business logic, data access, and service integration layer. |
| Database | Relational persistence for structured project and system data. |
| Scraper | Price collection and normalization module, when enabled. |

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Vue 3, Vite, TailwindCSS |
| State Management | Pinia |
| Routing | Vue Router |
| 3D Rendering | Three.js |
| Backend | FastAPI |
| Database | PostgreSQL |
| Authentication | Supabase |
| Infrastructure | Docker, Vercel, Railway |
| UI Icons | Lucide Icons |

## Architecture

```text
Frontend Vue/Vite
    -> FastAPI Backend
        -> PostgreSQL

Frontend Vue/Vite
    -> Supabase Auth, when configured

Scraper
    -> PostgreSQL
```

SIEC follows a modular architecture where the frontend handles the interactive editor, visualization, dashboard, analytics, and settings experience. The backend is responsible for API logic and data workflows. PostgreSQL supports structured persistence, while the scraper module can be used to prepare or update external pricing data.

## Repository Structure

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

## Quick Start

### Clone the repository

```bash
git clone https://github.com/Raizexs/SIEC.git
cd SIEC
```

### Run with Docker

```bash
docker-compose up --build
```

### Run the frontend manually

```bash
cd frontend
npm install
npm run dev
```

### Run the backend manually

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Environment configuration depends on the module being executed.

## Project Status

SIEC is currently in **beta** (v0.3).

The core product loop — workspace, 2D/3D editor, normative validation, budget flow, dashboard, analytics, and settings — is functional and under active polish. Privacy compliance (Ley 21.719), SIEC Place, billing infrastructure, and the GSAP motion layer are in place. Some exports, integrations, and pricing sources remain in beta or behind feature flags.

## Roadmap

### Recently Delivered (2026 Q2)

- **Privacy & compliance (Ley 21.719):** consent registry, policy acceptance gate, privacy settings, data-retention migration, and compliance documentation.
- **Motion system:** GSAP-based transitions and hover across dashboard, workspace, sidebar, top navigation, and editor toolbars.
- **Editor preferences:** product settings wired to 2D/3D (grid, labels, minimap, initial view, 3D quality).
- **Normative engine:** Ley 21.725 (Ley del Mono), OGUC, LOSCAT, and LOSCAA validations in the workspace.
- **SIEC Place:** marketplace foundation, budget publishing flow, and dedicated listing views.
- **Billing & plans:** subscription tiers and plan-gated workspace features.
- **Exports:** PDF proposals and blueprint generation; GLB/GLTF scene export.

### Short Term

- Stabilize **IFC** export and improve **GLB** fidelity for complex scenes.
- Enable **project sharing** and **construction layers** once QA is complete.
- Complete end-to-end **data subject rights** flows (access, rectification, erasure).
- Integrate live **pricing APIs** and structured market cost sources (Metalcon / scraper pipeline).
- Expand **SIEC Place** discovery, moderation, and contractor matching.
- Continue visual QA across dark and light modes.

### Medium Term

- Customizable **commercial reports** and branded proposal templates.
- **Project version history** and recovery.
- Portfolio **analytics**, risk detection, and preventive logistics alerts.
- Operational **breach response** and treatment activity register (RAT).
- Google Drive backup and BIM connector evaluation (Revit / IFC).

### Long Term

- Advanced **BIM** integration and IFC round-trip workflows.
- **Multi-user** real-time collaboration in the workspace.
- Full **cloud synchronization** and offline-capable editing.
- **Predictive cost analysis** using historical project data.

## Team

<table>
  <tr>
    <td align="center" width="20%">
      <img src="https://avatars.githubusercontent.com/u/105559567?v=4" width="96" height="96" style="border-radius:50%" alt="Andres Tapia" /><br>
      <strong>Andres Tapia</strong><br>
      <sub>Product Manager</sub><br>
      <a href="mailto:a.tapialpez@uandresbello.edu">Email</a>
    </td>
    <td align="center" width="20%">
      <img src="https://avatars.githubusercontent.com/u/128178198?v=4" width="96" height="96" style="border-radius:50%" alt="Lukas Flores" /><br>
      <strong>Lukas Flores</strong><br>
      <sub>Technical Lead</sub><br>
      <a href="mailto:l.floreszuiga@uandresbello.edu">Email</a>
    </td>
    <td align="center" width="20%">
      <img src="https://avatars.githubusercontent.com/u/190417123?v=4" width="96" height="96" style="border-radius:50%" alt="Gonzalo Jara" /><br>
      <strong>Gonzalo Jara</strong><br>
      <sub>Scrum Master</sub><br>
      <a href="mailto:g.jaravrsalovic@uandresbello.edu">Email</a>
    </td>
    <td align="center" width="20%">
      <img src="https://avatars.githubusercontent.com/u/128172645?v=4" width="96" height="96" style="border-radius:50%" alt="Felipe Figueroa" /><br>
      <strong>Felipe Figueroa</strong><br>
      <sub>Developer</sub><br>
      <a href="mailto:f.figueroadaz2@uandresbello.edu">Email</a>
    </td>
    <td align="center" width="20%">
      <img src="https://avatars.githubusercontent.com/u/185566076?v=4" width="96" height="96" style="border-radius:50%" alt="Fernando Salazar" /><br>
      <strong>Fernando Salazar</strong><br>
      <sub>Developer</sub><br>
      <a href="mailto:f.salazarcartes@uandresbello.edu">Email</a>
    </td>
  </tr>
</table>

## License

All rights reserved.

This project is proprietary. No part of this repository may be copied, modified, distributed, sublicensed, or used for commercial purposes without prior written permission from the project owners.

Copyright (c) 2026 SIEC Team.
