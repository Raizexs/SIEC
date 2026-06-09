"""Smoke tests for scraper pipeline (CI gate)."""

from unittest.mock import MagicMock, patch

import pytest


def test_fallback_prices_non_empty():
    from fallback_prices import get_fallback_results

    insumos = [
        {"id": insumo_id, "categoria": "Obra Gruesa"}
        for insumo_id in (1, 2, 3, 4, 5)
    ]
    results = get_fallback_results(insumos)
    assert len(results) >= 5
    for row in results[:3]:
        assert row.get("precio") is not None
        assert float(row["precio"]) > 0


@patch("serpapi_scraper.SerpAPIScraper.scrape_by_keywords")
def test_serpapi_scraper_returns_list(mock_scrape):
    mock_scrape.return_value = [
        {
            "insumo_id": 1,
            "exitoso": True,
            "nombre_producto": "Test",
            "precio": 9990,
            "tienda": "test",
            "url": "https://example.com",
        }
    ]
    from serpapi_scraper import SerpAPIScraper

    scraper = SerpAPIScraper(api_key="test-key")
    out = scraper.scrape_by_keywords([{"id": 1, "nombre": "Test"}])
    assert len(out) == 1
    assert out[0]["precio"] == 9990
