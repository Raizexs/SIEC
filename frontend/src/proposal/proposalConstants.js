/** Textos por defecto de la propuesta (editables vía preferencias en el futuro). */
export const DEFAULT_COMMERCIAL_TERMS = [
  {
    id: 'validez',
    title: '1. Validez de la oferta',
    text:
      'La presente propuesta tiene una vigencia de 30 días corridos desde la fecha de emisión. Los valores están sujetos a confirmación de disponibilidad de insumos y tipo de cambio cuando aplique.',
  },
  {
    id: 'alcance',
    title: '2. Alcance del servicio',
    text:
      'El presupuesto comprende la estimación de insumos y costos referenciales asociados al diseño y configuración cargada en SIEC Cloud. No incluye tramitaciones, proyectos de especialidades ni obras no explicitadas en el desglose.',
  },
  {
    id: 'precios',
    title: '3. Precios y actualización',
    text:
      'Los montos se expresan en pesos chilenos (CLP) como referencia de mercado según fecha indicada en el documento. Cualquier variación de precios de proveedores o materiales podrá ajustar el total previo acuerdo escrito.',
  },
  {
    id: 'pago',
    title: '4. Condiciones de pago',
    text:
      'Salvo acuerdo comercial distinto: 30% al aceptar la propuesta, 40% contra avance de obra estructurada y 30% contra entrega. Los hitos se definirán en contrato o orden de compra.',
  },
  {
    id: 'plazo',
    title: '5. Plazos',
    text:
      'El plazo de ejecución se estimará en planificación detallada posterior a la aceptación de la propuesta y validación técnica del proyecto en terreno.',
  },
  {
    id: 'exclusiones',
    title: '6. Exclusiones',
    text:
      'No se incluyen arriendos, seguros de obra, imprevistos no declarados, modificaciones de diseño posteriores a la aceptación ni costos de financiamiento.',
  },
];

export const PROPOSAL_SECTIONS = [
  { id: 'resumen', label: 'Resumen ejecutivo' },
  { id: 'proyecto', label: 'Antecedentes del proyecto' },
  { id: 'economico', label: 'Resumen económico' },
  { id: 'desglose', label: 'Desglose de insumos' },
  { id: 'condiciones', label: 'Condiciones comerciales' },
  { id: 'cierre', label: 'Validación y cierre' },
  { id: 'anexos', label: 'Anexos' },
];
