# scraper/scrapers/__init__.py
from .sodimac import scrape_sodimac
from .easy import scrape_easy
from .construmart import scrape_construmart
from .cmf import scrape_uf_cmf

__all__ = ["scrape_sodimac", "scrape_easy", "scrape_construmart", "scrape_uf_cmf"]
