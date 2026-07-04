import { LEGAL } from './legal.js';

/**
 * Copy de la página /exposmart — editar aquí sin tocar markup.
 */
export const EXPOSMART = {
  brand: {
    name: 'SIEC',
  },
  hero: {
    banner: '/exposmart/banner-siec.png',
    bannerAlt: 'Banner del proyecto SIEC',
    title: 'Sistema Inteligente de Estimación de Costos',
    subtitle:
      'Plataforma web para planificar espacios, visualizar proyectos en 2D/3D y estimar costos de construcción de forma clara y profesional.',
    description:
      'Desarrollado por un equipo multidisciplinario. SIEC transforma decisiones espaciales tempranas en datos medibles para una mejor planificación presupuestaria.',
    ctaDemo: 'Probar la demo',
    ctaDemoHref: '#demo',
    ctaProject: 'Conocer el proyecto',
    ctaProjectHref: '#proyecto',
  },
  project: {
    title: 'Descripción y objetivos',
    description:
      'SIEC es un Sistema Inteligente de Estimación de Costos diseñado para estudiantes, docentes y profesionales del rubro construcción. Integra editor 2D, visualización 3D en tiempo real, desglose de presupuesto y marketplace SIEC Place en un flujo único.',
    problem:
      'La estimación manual de costos en proyectos de construcción es lenta, propensa a errores y dificulta comparar alternativas antes de comprometer recursos.',
    objectives: [
      'Centralizar la información del proyecto en una plataforma accesible desde cualquier dispositivo.',
      'Reducir errores en cálculos mediante un flujo guiado y datos estructurados.',
      'Ofrecer visualización 2D/3D para validar decisiones espaciales antes de estimar.',
      'Conectar propietarios con contratistas a través de SIEC Place con estimaciones verificables.',
    ],
  },
  gallery: {
    title: 'La solución en acción',
    subtitle: 'Capturas de pantalla de los módulos principales de SIEC.',
    items: [
      {
        src: '/exposmart/dashboard.png',
        title: 'Dashboard',
        description: 'Vista general de proyectos guardados y acceso rápido al workspace.',
      },
      {
        src: '/exposmart/workspace-2d.png',
        title: 'Editor 2D',
        description: 'Planificación espacial con recintos, layouts y validación de área.',
      },
      {
        src: '/exposmart/workspace-3d.png',
        title: 'Visualización 3D',
        description: 'Modelo tridimensional en tiempo real para revisar el proyecto.',
      },
      {
        src: '/exposmart/presupuesto.png',
        title: 'Presupuesto',
        description: 'Desglose de costos por categoría con contingencia y exportación.',
      },
      {
        src: '/exposmart/siecplace.png',
        title: 'SIEC Place',
        description: 'Marketplace para publicar obras y conectar con contratistas.',
      },
    ],
  },
  impact: {
    title: 'Valor e impacto',
    subtitle: 'Beneficios concretos para docentes, estudiantes, invitados y evaluadores.',
    items: [
      {
        title: 'Estimación inteligente',
        body: 'Convierte características del proyecto en presupuestos organizados y comprensibles.',
      },
      {
        title: 'Diseño y simulación',
        body: 'Editor 2D y visor 3D integrados para validar espacios antes de estimar costos.',
      },
      {
        title: 'Decisiones informadas',
        body: 'Menos improvisación y mayor confianza al planificar recursos y plazos.',
      },
      {
        title: 'SIEC Place',
        body: 'Monetiza intención real de construir conectando clientes y contratistas verificados.',
      },
      {
        title: 'Normativa y cumplimiento',
        body: 'Soporte para validaciones técnicas y flujos alineados a estándares del rubro.',
      },
      {
        title: 'Acceso multiplataforma',
        body: 'Experiencia SaaS moderna, responsive y disponible desde navegador web.',
      },
    ],
  },
  team: {
    title: 'Integrantes del equipo',
    subtitle: 'Equipo SIEC',
    members: [
      {
        name: 'Andrés Tapia',
        role: 'Product Manager',
        email: 'a.tapialopez@uandresbello.edu',
        avatar: '/exposmart/team/Andres%20Tapia.png',
      },
      {
        name: 'Lukas Flores',
        role: 'Technical Lead',
        email: 'l.floreszuiga@uandresbello.edu',
        avatar: '/exposmart/team/Lukas%20Flores.jpg',
      },
      {
        name: 'Gonzalo Jara',
        role: 'Scrum Master',
        email: 'g.jaravrsalovic@uandresbello.edu',
        avatar: '/exposmart/team/Gonzalo%20Jara.png',
      },
      {
        name: 'Felipe Figueroa',
        role: 'Developer',
        email: 'f.figueroadaz2@uandresbello.edu',
        avatar: '/exposmart/team/Felipe%20Figueroa.png',
      },
      {
        name: 'Fernando Salazar',
        role: 'Developer',
        email: 'f.salazarcartes@uandresbello.edu',
        avatar: '/exposmart/team/Fernando%20Salazar.png',
      },
    ],
  },
  demo: {
    title: 'Demo en vivo',
    subtitle: 'Escanea el código QR o abre la demo para probar SIEC.',
    url: 'https://proyectsiec.vercel.app/login',
    cta: 'Abrir demo',
  },
  contact: {
    title: 'Contacto',
    subtitle: '¿Tienes preguntas sobre el proyecto? Escríbenos.',
    email: LEGAL.supportEmail,
    roles: ['Docente', 'Estudiante', 'Evaluador', 'Invitado', 'Otro'],
    submit: 'Enviar mensaje',
    successToast: 'Se abrió tu cliente de correo. Completa y envía el mensaje.',
  },
  nav: {
    items: [
      { id: 'proyecto', label: 'Proyecto' },
      { id: 'solucion', label: 'Solución' },
      { id: 'impacto', label: 'Impacto' },
      { id: 'equipo', label: 'Equipo' },
      { id: 'contacto', label: 'Contacto' },
    ],
    cta: 'Ver demo',
    ctaSection: 'demo',
  },
  footer: {
    tagline: 'Hecho con propósito en Chile',
  },
};

export const EXPOSMART_SECTION_IDS = new Set([
  'inicio',
  'proyecto',
  'solucion',
  'impacto',
  'equipo',
  'demo',
  'contacto',
]);
