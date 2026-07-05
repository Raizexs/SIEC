/**
 * Copy de la landing pública — editar aquí sin tocar markup.
 */
export const LANDING = {
  brand: {
    name: 'SIEC',
    tagline: 'Sistema Inteligente de Estimación',
  },
  hero: {
    title: 'Estima los costos de tu proyecto de forma rápida e inteligente',
    subtitle:
      'SIEC transforma la información de tu proyecto en una estimación de costos clara, organizada y fácil de comprender.',
    description:
      'Reduce cálculos manuales, evita errores y toma mejores decisiones antes de comenzar tu proyecto.',
    ctaPrimary: 'Comenzar estimación',
    ctaPrimaryHref: '/login?mode=register',
    previewBudget: {
      projectName: 'Casa básica',
      rooms: '3 recintos · 40 m²',
      subtotal: '$12.450.000',
      contingency: '$1.245.000',
      total: '$13.695.000',
      status: 'Estimación inicial',
      ariaLabel:
        'Vista previa: plano 2D, modelo 3D y presupuesto estimado de una casa básica de 40 metros cuadrados',
    },
  },
  whatIs: {
    title: '¿Qué es SIEC?',
    body: 'SIEC es un Sistema Inteligente de Estimación de Costos diseñado para ayudarte a calcular el presupuesto aproximado de un proyecto utilizando sus principales características y requerimientos.',
  },
  howItWorks: {
    title: '¿Cómo funciona?',
    steps: [
      { title: 'Ingresa los datos', body: 'Ingresa los datos de tu proyecto.' },
      { title: 'Define características', body: 'Define sus características y recursos necesarios.' },
      { title: 'Obtén la estimación', body: 'Obtén una estimación organizada de los costos.' },
      { title: 'Revisa y planifica', body: 'Revisa los resultados y planifica tu presupuesto.' },
    ],
  },
  benefits: {
    title: 'Beneficios',
    items: [
      'Estimaciones rápidas y centralizadas.',
      'Menos errores en los cálculos.',
      'Información clara para tomar decisiones.',
      'Mejor planificación del presupuesto.',
      'Acceso desde cualquier dispositivo.',
    ],
  },
  finalCta: {
    title: 'Planifica tu proyecto con mayor confianza',
    body: 'Comienza a utilizar SIEC y obtén una estimación de costos para tu próximo proyecto.',
    cta: 'Probar SIEC ahora',
    ctaHref: '/login',
  },
  nav: {
    signIn: 'Acceder',
    signInHref: '/login',
    cta: 'Comenzar estimación',
    ctaHref: '/login?mode=register',
  },
  footer: {
    tagline: 'Hecho con propósito en Chile',
  },
};
