#!/usr/bin/env python3
"""
Playwright verification script: validates CSS selectors against live product URLs.
Runs headless Chromium and extracts data using config.STORES selectors.
"""

import asyncio
import sys
from playwright.async_api import async_playwright

# Quick inline config (normally imported from config.py)
STORES = {
    'sodimac': {
        'product_urls': [
            'https://www.sodimac.cl/sodimac-cl/articulo/110277134/hormigon-preparado-para-radieres-sobrelosas-pilares-25-kg/110277137',
            'https://www.sodimac.cl/sodimac-cl/articulo/110282820/fierro-liso-cuadrado-acero-10x10-5-mm-6-m/110282823',
            'https://www.sodimac.cl/sodimac-cl/articulo/110288145/placa-fibrocemento-lisa-4-mm-120x240-cm-blanco/110288165',
        ],
        'selectors': {
            'name': '.pdp-basic-info__product-name',
            'price': '.copy12.primary.senary',
            'stock': 'p.store-availability.available',
        }
    },
    'easy': {
        'product_urls': [
            'https://www.easy.cl/cemento-especial-25-kg-polpaico-1195183/p',
            'https://www.easy.cl/perfil-rectangulo-30x20x2-mm-6-m-816-kg-119314/p',
        ],
        'selectors': {
            'name': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > h1',
            'price': '#__next > main > main > div:nth-child(3) > div > section > div.sc-8e800ca6-5.ia-dcNO > div > span.sc-11b00991-5.dEKQBo > div.sc-1f784e80-0.bZLqYQ > div',
        }
    },
    'construmart': {
        'product_urls': [
            'https://www.construmart.cl/cemento-especial-saco-25-kg-san-juan-245005',
            'https://www.construmart.cl/barra-cuadrada-laminada-10-x-10-mm-47-30872',
        ],
        'selectors': {
            'name': '.product-name, h1',
            'price': '.price-container .price, .product-price',
        }
    }
}

async def verify_selectors():
    """Test selectors against live URLs."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for store_name, store_config in STORES.items():
            print(f"\n📍 Testing {store_name.upper()}")
            print("=" * 60)
            
            for url in store_config['product_urls']:
                page = await browser.new_page()
                page.set_default_timeout(30000)
                
                try:
                    await page.goto(url, wait_until='networkidle')
                    print(f"\n✅ Loaded: {url[:60]}...")
                    
                    for field, selector in store_config['selectors'].items():
                        try:
                            element = await page.query_selector(selector)
                            if element:
                                text = await element.text_content()
                                print(f"   ✅ {field}: {text.strip()[:80]}")
                            else:
                                print(f"   ❌ {field}: Not found")
                        except Exception as e:
                            print(f"   ⚠️  {field}: {str(e)[:50]}")
                
                except Exception as e:
                    print(f"❌ Failed to load {url[:40]}...: {str(e)[:60]}")
                
                finally:
                    await page.close()
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(verify_selectors())
