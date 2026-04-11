import json
import sys
import os
import time

# Load config
sys.path.append(os.path.abspath('.'))
try:
    from scraper.config import STORES
except Exception as e:
    print(json.dumps({'error': 'failed to import STORES', 'exc': str(e)}))
    raise

from playwright.sync_api import sync_playwright

OUTPUT_LIMIT = 5

def sample_texts(nodes):
    out = []
    for n in nodes[:OUTPUT_LIMIT]:
        try:
            txt = n.inner_text().strip()
        except Exception:
            try:
                txt = n.get_attribute('aria-label') or n.get_attribute('title') or n.inner_html()[:500]
            except Exception:
                txt = ''
        out.append(txt)
    return out

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    results = []
    for store_key, store in STORES.items():
        selectors = store.get('selectors', {})
        urls = store.get('product_urls', [])
        for url in urls[:5]:
            item = {'store': store_key, 'url': url, 'selectors': {}}
            try:
                page.goto(url, wait_until='networkidle', timeout=60000)
                time.sleep(0.5)
            except Exception as e:
                item['error'] = f'goto_error: {e}'
                results.append(item)
                continue
            for name, sel_obj in selectors.items():
                css = sel_obj.get('css') if isinstance(sel_obj, dict) else sel_obj
                if not css:
                    item['selectors'][name] = {'matches': 0, 'samples': []}
                    continue
                try:
                    nodes = page.query_selector_all(css)
                    samples = sample_texts(nodes) if nodes else []
                    item['selectors'][name] = {'matches': len(nodes), 'samples': samples}
                except Exception as e:
                    item['selectors'][name] = {'error': str(e)}
            results.append(item)
    browser.close()
    print(json.dumps(results, ensure_ascii=False, indent=2))
