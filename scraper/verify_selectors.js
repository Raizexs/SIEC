/*
  Helper para pegar en la consola de Chrome DevTools y verificar selectores.
  Uso:
    1) En la página de listado / producto, abre DevTools (F12)
    2) Copia y pega este script en la consola
    3) Reemplaza el objeto `selectors` por los selectores que quieres probar:
       ej: const selectors = { name: '.product-title', price: '.price' }
    4) Ejecuta y revisa el conteo y 5 ejemplos por selector.
*/
(function verify(selectors){
  function sampleNodes(sel){
    if(!sel) { console.warn('selector vacío'); return }
    try{
      const nodes = document.querySelectorAll(sel);
      console.log(`Selector: ${sel} → ${nodes.length} match(es)`);
      for(let i=0;i<Math.min(5, nodes.length); i++){
        const txt = nodes[i].textContent ? nodes[i].textContent.trim() : nodes[i].getAttribute('aria-label') || nodes[i].outerHTML;
        console.log(`  [${i+1}] `, txt.slice(0,200));
      }
    }catch(e){ console.error('Error al evaluar selector', sel, e) }
  }

  console.group('Verify selectors');
  Object.entries(selectors).forEach(([k,v])=>{
    console.group(k);
    if(typeof v === 'string') sampleNodes(v);
    else if(v && v.css) sampleNodes(v.css);
    else console.warn('Formato de selector no reconocido para', k, v);
    console.groupEnd();
  })
  console.groupEnd();
})({
  // ejemplo: rellena aquí las claves que quieras probar
  // name: '.product-card__title',
  // price: '.price__amount',
});
