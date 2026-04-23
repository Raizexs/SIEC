#!/usr/bin/env python3
from scraper.config import STORES

for store_name, store in STORES.items():
    print(f'\n=== {store_name.upper()} ===')
    print(f'Base URLs: {len(store["base_urls"])}')
    print(f'Product URLs: {len(store["product_urls"])}')
    print('URLs:')
    for i, url in enumerate(store['product_urls'], 1):
        print(f'  {i}. {url}')
    print(f'Selectores: {list(store["selectors"].keys())}')
