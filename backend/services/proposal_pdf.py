"""
PDF vectorial desde HTML usando Chromium (Playwright page.pdf).

Texto y tablas salen como vectores; solo imágenes (logo, captura 3D) van rasterizadas.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_PLAYWRIGHT_AVAILABLE = False
_sync_playwright = None

try:
    from playwright.sync_api import sync_playwright

    _sync_playwright = sync_playwright
    _PLAYWRIGHT_AVAILABLE = True
except ImportError:
    pass


class ProposalPdfError(Exception):
    """Error controlado al generar PDF."""


def is_proposal_pdf_available() -> bool:
    return _PLAYWRIGHT_AVAILABLE


def html_to_pdf_bytes(html: str) -> bytes:
    """
    Renderiza HTML completo (<!DOCTYPE html>…) a PDF A4.
    Debe ejecutarse fuera del event loop (ThreadPoolExecutor).
    """
    if not _PLAYWRIGHT_AVAILABLE or _sync_playwright is None:
        raise ProposalPdfError(
            "Playwright no está instalado. Ejecuta: pip install playwright && playwright install chromium"
        )

    try:
        with _sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={"width": 794, "height": 1123})
                page.set_content(html, wait_until="networkidle")
                page.emulate_media(media="print")
                return page.pdf(
                    format="A4",
                    print_background=True,
                    prefer_css_page_size=True,
                    margin={
                        "top": "0mm",
                        "right": "0mm",
                        "bottom": "0mm",
                        "left": "0mm",
                    },
                )
            finally:
                browser.close()
    except Exception as exc:
        msg = str(exc).lower()
        if "executable doesn't exist" in msg or "browserType.launch" in msg:
            raise ProposalPdfError(
                "Chromium para Playwright no está instalado. Ejecuta: playwright install chromium"
            ) from exc
        logger.exception("Error generando PDF con Playwright")
        raise ProposalPdfError(f"Error al renderizar PDF: {exc}") from exc
