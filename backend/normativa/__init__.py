"""Validación normativa chilena (Ley 21.725, OGUC, LOSCAT, LOSCAA)."""

try:
    from normativa.validator import validar_normativa
except ModuleNotFoundError:
    from backend.normativa.validator import validar_normativa  # type: ignore

__all__ = ["validar_normativa"]
