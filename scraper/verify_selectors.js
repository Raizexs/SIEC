/*
  Verificadores de selectores CSS para Sodimac, Easy y Construmart.
  Uso: Pega el script completo en la consola de Chrome DevTools (F12) en cada página de producto.
*/

(function testSodimac() {
    const config = {
        name: 'Sodimac',
        selectors: {
            name: '.pdp-basic-info__product-name',
            price: '.copy12.primary.senary', 
            price_discount: '.copy12.primary.senary.bold',
            stock: 'p.store-availability.available',
            category: 'a.Breadcrumbs-module_selected-bread-crumb__ZPj02'
        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #ed1c24; color: white; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el) {
            let value = el.textContent.trim();
            if (key === 'pagination' && el.href) {
                value = `Link a siguiente página -> ${el.href}`;
            }
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            console.warn(`❌ ${key}: No encontrado (Selector: ${selector})`);
        }
    });
})();

(function testEasy() {
    const config = {
        name: 'Easy',
        selectors: {
            name: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1',
            price: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div',
            price_discount: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo',
            stock: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div:nth-child(8) > dialog > div > div.sc-b9a1d677-3.kxmjzI > div > div > div > p',
            category: '#__next > main > main > div:nth-child(3) > div > div.sc-eb8d352a-0.dTMHsi > div > div:nth-child(4) > a > span',
            pagination: '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > div.sc-1f784e80-0.bZLqYQ > div > a' 
        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #00a12e; color: white; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el) {
            let value = el.textContent.trim();
            if (key === 'pagination' && (el.href || el.tagName === 'BUTTON')) {
                value = el.href ? `Link -> ${el.href}` : "Botón 'Ver más' detectado";
            }
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            if (key === 'stock' || key === 'pagination') {
                console.log(`❌ %c${key}:`, 'font-weight: bold; color: #e74c3c', 'No se encuentra en la página');
            } else {
                console.warn(`❌ ${key}: No encontrado`);
            }
        }
    });
})();

(function testConstrumart() {
    const config = {
        name: 'Construmart',
        selectors: {
            name: '.product-name, h1',
            price: '.price-container .price, .product-price',
            price_discount: '.special-price .price',
            stock: '.stock-info, .availability',
            category: '.breadcrumb-item, .breadcrumbs li',
            pagination: '.pagination .next, a[rel="next"]'
        }
    };

    console.log(`%c Testing: ${config.name} `, 'background: #ffcc00; color: black; font-weight: bold;');
    console.log(`%cURL ACTUAL: %c${window.location.href}`, 'font-weight: bold', 'color: #3498db');
    console.log('-----------------------------------');

    Object.entries(config.selectors).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el) {
            let value = el.textContent.trim().replace(/\s+/g, ' ');
            console.log(`✅ %c${key}:`, 'font-weight: bold', value);
        } else {
            console.warn(`❌ ${key}: No encontrado`);
        }
    });
})();
