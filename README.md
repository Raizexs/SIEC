# 🏗️ SIEC - Sistema Inteligente de Estimación de Costos

</div>

![Unity](https://img.shields.io/badge/Unity-100000?style=for-the-badge&logo=unity&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![Status](https://img.shields.io/badge/Status-In%20Development-warning?style=for-the-badge)
![Scrum](https://img.shields.io/badge/Methodology-Scrum-blue?style=for-the-badge&logo=scrumalliance&logoColor=white)

**Sistema orientado a la estimación automática de costos de construcción de viviendas basado en métricas por metro cuadrado y configuración estructural.**

---

## � Sobre el Proyecto

**SIEC** es un sistema inteligente desarrollado para empresas constructoras que automatiza el desglose y cálculo de los insumos requeridos para la edificación de viviendas.

> �🎓 **Contexto Académico:** Este proyecto está siendo desarrollado para la asignatura de **Ingeniería de Software II**.

### � El Problema

La estimación de costos y materiales en proyectos de construcción residencial a menudo implica:
- Procesos manuales propensos a errores en el cálculo de insumos.
- Dificultad para visualizar rápidamente cómo los cambios estructurales o de diseño impactan en los requerimientos.
- Tiempos de respuesta lentos para la generación de presupuestos iniciales precisos.

### ✨ La Solución

Un **sistema interactivo** que permite:
- ✅ **Configuración dinámica:** Ajuste de metros cuadrados totales, número de habitaciones (simples, dobles, triples), baños, áreas comunes y tipo de material estructural.
- ✅ **Cálculo automático:** Determinación precisa de los insumos base como **Fierro, Cemento, Agua, Cableado, Tuberías y Mano de Obra**.
- ✅ **Visualización 3D/Web:** Una interfaz interactiva (frontend web dinámico creado con Unity) que mejora y facilita la experiencia de pre-visualización.
- ✅ **Reglas de negocio robustas:** Motor de cálculo paramétrico y validación de reglas constructivas en el backend.

---

## 📐 Arquitectura Base

El sistema está planteado con una arquitectura moderna que separa la interfaz de los robustos motores de reglas:

* **Frontend:** Interfaz web dinámica e interactiva desarrollada con **Unity**, orientada a brindar una experiencia de usuario fluida.
* **Backend (Aplicación):** 
  * Motor de cálculo paramétrico encargado de las matemáticas del proyecto.
  * Motor de reglas constructivas que valida las coherencias estructurales.
* **Base de Datos:** Estructura relacional preparada para manejar métricas base y precios actualizables.

---

## 🛤️ Líneas de Mejora y Futuro (Roadmap)

Con miras a convertir la aplicación en una solución de nivel empresarial, se planean las siguientes evoluciones:

- 🛠️ **Técnicas:** Integración con APIs de proveedores para actualización de tarifas de materiales, Simulación de escenarios y Exportación a sistemas ERP.
- 🏛️ **Arquitectónicas:** Arquitectura orientada a dominio (DDD) y extracción del motor de cálculo en un microservicio escalable e independiente.
- 💼 **De Negocio:** Modelo SaaS (Software as a Service) para alojar a múltiples firmas constructoras, Comparación histórica de presupuestos y Control automatizado de desviaciones de material.

---

## 📂 Futura Estructura del Proyecto

```text
SIEC/
│
├── 📁 frontend/                # Proyecto Unity (Interfaz y visualización)
│   ├── Assets/                 # Modelos, Scripts C# (UI), Escenas
│   ├── Packages/
│   └── ProjectSettings/
│
├── 📁 backend/                 # Motor de cálculo y Reglas constructivas
│   ├── src/
│   │   ├── controllers/        # Endpoints
│   │   ├── services/           # Lógica paramétrica de cálculo
│   │   └── models/             # Entidades de Base de Datos
│   ├── tests/                  # Pruebas unitarias
│   └── package.json (o .csproj)
│
├── 📁 docs/                    # Documentación del proyecto
│   ├── Manual_Usuario.md
│   ├── Arquitectura.md
│   └── Casos_de_Uso.md
│
├── 📁 database/                # Scripts SQL y esquemas
│   ├── schema.sql
│   └── metrics_seed.sql        # Precios base
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🛠️ Tecnologías

<table>
<tr>
<td align="center" width="20%">
<img src="https://upload.wikimedia.org/wikipedia/commons/c/c4/Unity_2021.svg" width="48" height="48" alt="Unity" /><br>
<b>Unity</b><br>
<sub>Frontend Interactivo</sub>
</td>
<td align="center" width="20%">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Logo_C_sharp.svg/960px-Logo_C_sharp.svg.png" width="48" height="48" alt="C#" /><br>
<b>C# / .NET</b><br>
<sub>Scripts & Backend</sub>
</td>
<td align="center" width="20%">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Postgresql_elephant.svg/960px-Postgresql_elephant.svg.png" width="48" height="48" alt="DB" /><br>
<b>Base de Datos</b><br>
<sub>Almacenamiento Relacional</sub>
</td>
<td align="center" width="20%">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/500px-Octicons-mark-github.svg.png" width="48" height="48" alt="GitHub" /><br>
<b>GitHub</b><br>
<sub>Control de Versiones</sub>
</td>
<td align="center" width="20%">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Jira_Logo.svg/3840px-Jira_Logo.svg.png" width="48" height="48" alt="Jira" /><br>
<b>Jira</b><br>
<sub>Gestión Ágil (Scrum)</sub>
</td>
</tr>
</table>

## 👥 Equipo

<table>
<tr>
<td align="center" width="25%">
<img src="https://avatars.githubusercontent.com/u/128178198?v=4" width="100" height="100" style="border-radius:50%" alt="Lukas Flores" /><br>
<b>Lukas Flores</b><br>
<sub>Product Owner</sub><br>
<a href="mailto:l.floreszuiga@uandresbello.edu">📧 Email</a>
</td>
<td align="center" width="25%">
<img src="https://avatars.githubusercontent.com/u/190417123?v=4" width="100" height="100" style="border-radius:50%" alt="Gonzalo Jara" /><br>
<b>Gonzalo Jara</b><br>
<sub>Scrum Master</sub><br>
<a href="mailto:g.jaravrsalovic@uandresbello.edu">📧 Email</a>
</td>
<td align="center" width="25%">
<img src="https://avatars.githubusercontent.com/u/128172560?v=4" width="100" height="100" style="border-radius:50%" alt="Andres Tapia" /><br>
<b>Andres Tapia</b><br>
<sub>Dev Líder</sub><br>
<a href="mailto:a.tapialpez@uandresbello.edu">📧 Email</a>
</td>
<td align="center" width="25%">
<img src="https://avatars.githubusercontent.com/u/128172530?v=4" width="100" height="100" style="border-radius:50%" alt="Felipe Figueroa" /><br>
<b>Felipe Figueroa</b><br>
<sub>Developer</sub><br>
<a href="mailto:f.figueroadaz2@uandresbello.edu">📧 Email</a>
</td>
</tr>
<tr>
<td align="center" width="25%">
<img src="https://avatars.githubusercontent.com/u/236717677?v=4" width="100" height="100" style="border-radius:50%" alt="Fernando Arancibia" /><br>
<b>Fernando Salazar</b><br>
<sub>Developer</sub><br>
<a href="mailto:f.salazarcartes@uandresbello.edu">📧 Email</a>
</td>
<td colspan="3" align="center">
<br>
<b>Compromiso del equipo:</b> 6-8 hrs/semana por integrante<br>
<b>Ceremonias:</b> Planning, Dailies, Review, Retro, Refinement<br>
<b>Comunicación:</b> Discord + Jira + GitHub
</td>
</tr>
</table>

### Roles y Responsabilidades

| Rol                     | Responsabilidades                                                        |
| ----------------------- | ------------------------------------------------------------------------ |
| **Product Owner** | Definir prioridades, validar criterios de aceptación, gestionar backlog |
| **Scrum Master**  | Facilitar ceremonias, remover impedimentos, velar por proceso Scrum      |
| **Dev Líder**    | Arquitectura técnica, revisión de código, integración E2E            |
| **Developers**    | Implementar HUs, pruebas unitarias, documentación técnica              |

---

## 📜 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- **Universidad:** Por el apoyo y recursos para desarrollar este proyecto dentro de la malla académica.
- **Asignatura de Ingeniería de Software II:** Por la guía metodológica y formativa durante el ciclo de vida del desarrollo.
- **Equipo de desarrollo:** Por el firme compromiso, colaboración y dedicación constante a lo largo de los sprints.

---

<div align="center">

Hecho con ❤️ por el equipo de SIEC

![Made with Unity](https://img.shields.io/badge/Made%20with-Unity-100000?style=flat-square&logo=unity)
![Scrum](https://img.shields.io/badge/Powered%20by-Scrum-blue?style=flat-square&logo=scrumalliance)

</div>
