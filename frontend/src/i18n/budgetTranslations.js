/** Traducciones del panel Presupuesto detallado (ES/EN). */

export const budgetTranslationsEs = {
  budgetEconomicEstimate: "Estimación económica",
  budgetDetailedTitle: "Presupuesto detallado",
  budgetSubtitle:
    "Calcula insumos, cantidades y subtotales según los recintos seleccionados y el material estructural actual.",
  budgetM2Calculated: "{m2} m² calculados",
  budgetInactive: "Presupuesto inactivo",
  budgetInactiveHint:
    "Genera un presupuesto usando la selección actual de recintos, superficie calculada y material estructural del proyecto.",
  budgetCalculateReal: "Calcular presupuesto real",
  budgetScraperHint: "Consulta precios de mercado actualizados vía scraper.",
  budgetLoading: "Analizando insumos y materiales...",
  budgetLoadingHint: "Esto puede depender del backend y del scraper de precios.",
  budgetErrorTitle: "No se pudo generar el presupuesto",
  budgetTotalEstimated: "Costo total estimado",
  budgetMotorSubtotal: "Subtotal motor (CLP, API):",
  budgetContingency: "Contingencia {pct}%:",
  budgetContingencyNote: "(referencial sobre el total del motor).",
  budgetIvaRef: "IVA referencial ({pct}%):",
  budgetIvaNote: "sobre subtotal con contingencia (CLP).",
  budgetCurrencyViewNote:
    "La moneda mostrada arriba es vista; el cálculo sigue en CLP hasta integrar tipo de cambio.",
  budgetRefValueNote:
    "Valor referencial sujeto a disponibilidad y actualización de precios.",
  budgetQuoteStats: "{quoted} de {total} insumos cotizados",
  budgetPartialTotal: "(total parcial)",
  budgetNoPriceBadge: "Sin cotización",
  budgetNoPricesWarning:
    "No hay precios de mercado para este presupuesto. Revisa el scraper o tu plan.",
  budgetUpdated: "Actualizado:",
  budgetExportTitle: "Exportar presupuesto",
  budgetExport: "Exportar presupuesto",
  exportPanelTitle: "Entregables del proyecto",
  exportPanelSubtitle:
    "Descarga el presupuesto en PDF, Excel o CSV con las preferencias de exportación.",
  budgetReadyExportTitle: "Presupuesto listo para exportar",
  budgetReadyExportHint:
    "Revisa el desglose arriba. Cuando estés conforme, continúa al paso Exportar para descargar PDF, Excel o CSV.",
  budgetGoExport: "Ir a Exportar",
  budgetPrintPrefHint:
    "¿Vas a imprimir el PDF? Activa el registro opcional para impresión en ",
  budgetPrintPrefLink: "Ajustes → Entregables",
  budgetBreakdownTitle: "Desglose por categorías",
  budgetBreakdownHint:
    "Detalle de insumos, cantidades, precio unitario y subtotal.",
  budgetCategoriesCount: "{count} categorías",
  budgetItemsAssociated: "{count} insumos asociados",
  budgetSubtotal: "Subtotal",
  budgetSupply: "Insumo",
  budgetQtyShort: "Cant.",
  budgetUnitPrice: "Precio unit.",
  budgetQuantity: "Cantidad",
  budgetEmptyTitle: "No se encontraron insumos para este material.",
  budgetEmptyHint:
    "Revisa la selección de recintos o la materialidad estructural antes de volver a calcular.",
  budgetPricesUnavailable: "Precios de mercado no disponibles aún",
  budgetNa: "N/D",
  budgetErrSim: "Error al crear simulación",
  budgetErrCalc: "Error al calcular insumos",
  budgetPdfGenerating: "Generando PDF profesional…",
  budgetExportSuccess: "Archivo {format} descargado correctamente",
  budgetExportFailed: "No se pudo exportar el presupuesto",
};

export const budgetTranslationsEn = {
  budgetEconomicEstimate: "Economic estimate",
  budgetDetailedTitle: "Detailed budget",
  budgetSubtitle:
    "Calculate supplies, quantities and subtotals from selected rooms and the current structural material.",
  budgetM2Calculated: "{m2} m² calculated",
  budgetInactive: "Budget inactive",
  budgetInactiveHint:
    "Generate a budget using the current room selection, calculated area and project structural material.",
  budgetCalculateReal: "Calculate real budget",
  budgetScraperHint: "Fetches updated market prices via scraper.",
  budgetLoading: "Analyzing supplies and materials...",
  budgetLoadingHint: "This may depend on the backend and price scraper.",
  budgetErrorTitle: "Could not generate budget",
  budgetTotalEstimated: "Estimated total cost",
  budgetMotorSubtotal: "Engine subtotal (CLP, API):",
  budgetContingency: "Contingency {pct}%:",
  budgetContingencyNote: "(reference on engine total).",
  budgetIvaRef: "Reference VAT ({pct}%):",
  budgetIvaNote: "on subtotal with contingency (CLP).",
  budgetCurrencyViewNote:
    "Currency shown above is display-only; calculation remains in CLP until FX is integrated.",
  budgetRefValueNote:
    "Reference value subject to price availability and updates.",
  budgetQuoteStats: "{quoted} of {total} supplies quoted",
  budgetPartialTotal: "(partial total)",
  budgetNoPriceBadge: "No quote",
  budgetNoPricesWarning:
    "No market prices for this budget. Check the scraper or your plan.",
  budgetUpdated: "Updated:",
  budgetExportTitle: "Export budget",
  budgetExport: "Export budget",
  exportPanelTitle: "Project deliverables",
  exportPanelSubtitle:
    "Download the budget as PDF, Excel, or CSV using your export preferences.",
  budgetReadyExportTitle: "Budget ready to export",
  budgetReadyExportHint:
    "Review the breakdown above. When you're ready, continue to the Export step to download PDF, Excel, or CSV.",
  budgetGoExport: "Go to Export",
  budgetPrintPrefHint:
    "Printing the PDF? Enable the optional print review block in ",
  budgetPrintPrefLink: "Settings → Deliverables",
  budgetBreakdownTitle: "Breakdown by category",
  budgetBreakdownHint:
    "Supply detail, quantities, unit price and subtotal.",
  budgetCategoriesCount: "{count} categories",
  budgetItemsAssociated: "{count} associated supplies",
  budgetSubtotal: "Subtotal",
  budgetSupply: "Supply",
  budgetQtyShort: "Qty.",
  budgetUnitPrice: "Unit price",
  budgetQuantity: "Quantity",
  budgetEmptyTitle: "No supplies found for this material.",
  budgetEmptyHint:
    "Review room selection or structural material before recalculating.",
  budgetPricesUnavailable: "Market prices not available yet",
  budgetNa: "N/A",
  budgetErrSim: "Error creating simulation",
  budgetErrCalc: "Error calculating supplies",
  budgetPdfGenerating: "Generating professional PDF…",
  budgetExportSuccess: "{format} file downloaded successfully",
  budgetExportFailed: "Could not export budget",
};
