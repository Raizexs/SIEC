export const CATEGORIES = [
  {
    id: 'obraGruesa',
    label: 'Obra Gruesa y Fundaciones',
    keywords: ['fierro', 'cemento', 'arena', 'ripio', 'hormigón', 'acero', 'malla', 'concreto', 'fundación', 'grava', 'piedra'],
  },
  {
    id: 'tabiqueria',
    label: 'Estructura de Tabiquería',
    keywords: ['madera', 'pino', 'tabiquería', 'listón', 'montante', 'solera', 'pie derecho', 'cercha', 'pilar', 'estructural madera', 'entramado'],
  },
  {
    id: 'aislacionRevestimientos',
    label: 'Aislación y Revestimientos',
    keywords: ['volcanita', 'lana vidrio', 'lana mineral', 'aislación', 'revestimiento', 'yeso', 'cartón yeso', 'fibrocemento', 'siding', 'tablero osb', 'osb', 'poliestireno', 'plancha'],
  },
  {
    id: 'techumbre',
    label: 'Techumbre',
    keywords: ['techo', 'techumbre', 'teja', 'zinc', 'cerámica', 'cubierta', 'alero', 'canal', 'aguas lluvia', 'cercha techo'],
  },
  {
    id: 'instalaciones',
    label: 'Instalaciones',
    keywords: ['cable', 'tubo pvc', 'tubería', 'conductor', 'eléctrico', 'agua 75mm', 'sanitaria', 'instalación'],
  },
  {
    id: 'manoObra',
    label: 'Mano de Obra',
    keywords: ['mano de obra', 'mano obra'],
  },
];

function matchCategory(insumo) {
  const name = insumo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (name.includes(kw)) return cat;
    }
  }
  return null;
}

export function reorganizeDesglose(desglose) {
  const allItems = [];
  for (const cat of desglose) {
    for (const item of cat.items || []) {
      allItems.push({ ...item });
    }
  }

  const grouped = {};
  for (const item of allItems) {
    const matched = matchCategory(item.insumo);
    const catId = matched ? matched.id : 'otros';
    if (!grouped[catId]) {
      grouped[catId] = {
        categoria: matched ? matched.label : 'Otros',
        items: [],
        subtotal_categoria: 0,
      };
    }
    grouped[catId].items.push(item);
    grouped[catId].subtotal_categoria += item.subtotal || 0;
  }

  const ordered = [];
  for (const cat of CATEGORIES) {
    if (grouped[cat.id]) {
      ordered.push(grouped[cat.id]);
      delete grouped[cat.id];
    }
  }

  if (grouped.otros) {
    ordered.push(grouped.otros);
  }

  return ordered;
}
