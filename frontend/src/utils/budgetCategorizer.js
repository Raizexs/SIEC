const CATEGORY_DISPLAY = {
  'Obra Gruesa': { id: 'obraGruesa', label: 'Obra Gruesa y Fundaciones' },
  'Obra Gruesa - Complementos': { id: 'complementos', label: 'Complementos Obra Gruesa' },
  'Terminaciones': { id: 'terminaciones', label: 'Terminaciones y Revestimientos' },
  'Instalaciones': { id: 'instalaciones', label: 'Instalaciones' },
  'Techumbre - Estructura': { id: 'techumbre', label: 'Techumbre' },
  'Techumbre - Cubierta': { id: 'techumbre', label: 'Techumbre' },
  'Techumbre - Mano de Obra': { id: 'manoObra', label: 'Mano de Obra' },
  'Mano de Obra': { id: 'manoObra', label: 'Mano de Obra' },
};

const ORDER = ['obraGruesa', 'complementos', 'terminaciones', 'techumbre', 'instalaciones', 'manoObra'];

export function reorganizeDesglose(desglose) {
  const grouped = {};

  for (const cat of desglose) {
    const mapping = CATEGORY_DISPLAY[cat.categoria];
    const display = mapping || { id: 'otros', label: cat.categoria };

    if (!grouped[display.id]) {
      grouped[display.id] = {
        categoria: display.label,
        items: [],
        subtotal_categoria: 0,
      };
    }

    for (const item of cat.items || []) {
      grouped[display.id].items.push(item);
      grouped[display.id].subtotal_categoria += item.subtotal || 0;
    }
  }

  const ordered = [];
  for (const id of ORDER) {
    if (grouped[id]) {
      ordered.push(grouped[id]);
      delete grouped[id];
    }
  }

  for (const id of Object.keys(grouped)) {
    ordered.push(grouped[id]);
  }

  return ordered;
}
