import {
  formatClp,
  formatExportDate,
  formatNumber,
  normalizeDesglose,
} from "../utils/budgetExportShared.js";
import {
  DEFAULT_COMMERCIAL_TERMS,
  PROPOSAL_SECTIONS,
} from "./proposalConstants.js";
import { PROPOSAL_CSS } from "./proposalStyles.js";
import {
  resolveBrandLogoUrl,
} from "./proposalBrand.js";
import { normalizeProposalPayload } from "./normalizeProposalPayload.js";

const escapeHtml = (value) => {
  if (value == null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const safeText = (value, fallback = "—") => {
  if (value == null || value === "") return fallback;
  return String(value);
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

const formatRecintosSummary = (counts) => {
  const recintos = counts?.recintos ?? 0;
  const pasillos = counts?.pasillos ?? 0;
  return `${recintos} recintos · ${pasillos} pasillos`;
};

const renderInsumoCell = (item) => {
  const label = escapeHtml(safeText(item.insumo));
  const url = String(item.url_producto || item.url || "").trim();

  if (isHttpUrl(url)) {
    return `<a class="insumo-link" href="${escapeHtml(url)}" title="${escapeHtml(url)}">${label}</a>`;
  }

  return label;
};

const pageBreak = '<div class="html2pdf__page-break pdf-page-break"></div>';

const buildFinancialRows = (payload) => {
  const rows = [["Subtotal motor (CLP)", formatClp(payload.motorTotal)]];

  if (payload.contingencyPct > 0) {
    rows.push([
      `Contingencia (${payload.contingencyPct}%)`,
      formatClp(payload.deltaContingencia),
    ]);

    rows.push([
      "Subtotal con contingencia",
      formatClp(payload.subtotalConContingencia),
    ]);
  }

  if (payload.includeTax && payload.montoIva > 0) {
    rows.push(["IVA referencial (19%)", formatClp(payload.montoIva)]);
  }

  rows.push([
    "Total estimado",
    payload.totalFormatted ||
      formatClp(payload.totalPreferido ?? payload.motorTotal),
  ]);

  return rows;
};

const renderFinancialTable = (payload) => {
  const financial = buildFinancialRows(payload);

  const body = financial
    .map((row, index) => {
      const isTotal = index === financial.length - 1;

      return `<tr class="${isTotal ? "total-row" : ""}">
        <td>${escapeHtml(row[0])}</td>
        <td class="num">${escapeHtml(row[1])}</td>
      </tr>`;
    })
    .join("");

  return `<div class="table-wrap">
    <table class="data">
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="num">Monto</th>
        </tr>
      </thead>

      <tbody>
        ${body}
      </tbody>
    </table>
  </div>`;
};

const renderDesgloseTable = (desglose, payload = null) => {
  const includeBreakdown = payload?.includeMaterialsBreakdown !== false;
  const includeUnitPrices = payload?.includeUnitPrices !== false;

  if (!includeBreakdown) {
    return '<p class="placeholder">Desglose omitido según preferencias de exportación.</p>';
  }

  const normalized = normalizeDesglose(desglose);

  if (!normalized.length) {
    return '<p class="placeholder">No hay insumos en el desglose para este proyecto.</p>';
  }

  const rows = [];
  const priceCols = includeUnitPrices ? 2 : 0;
  const totalCols = 3 + priceCols;

  for (const category of normalized) {
    rows.push(
      `<tr class="cat-band">
        <td colspan="${totalCols}">
          ${escapeHtml(category.categoria)} · Subtotal: ${escapeHtml(formatClp(category.subtotal_categoria))}
        </td>
      </tr>`,
    );

    for (const item of category.items || []) {
      const priceCells = includeUnitPrices
        ? `<td class="num">${escapeHtml(formatClp(item.precio_unitario))}</td>
        <td class="num">${escapeHtml(formatClp(item.subtotal))}</td>`
        : `<td class="num">${escapeHtml(formatClp(item.subtotal))}</td>`;

      rows.push(`<tr class="desglose-item">
        <td>${renderInsumoCell(item)}</td>
        <td class="num">${escapeHtml(formatNumber(item.cantidad))}</td>
        <td>${escapeHtml(item.unidad || "—")}</td>
        ${priceCells}
      </tr>`);
    }
  }

  const subtotalInsumos = normalized.reduce(
    (sum, cat) => sum + (cat.subtotal_categoria || 0),
    0,
  );
  const totalDisplay =
    payload?.totalFormatted ||
    formatClp(payload?.totalPreferido ?? subtotalInsumos);

  const totalLabelColspan = includeUnitPrices ? 4 : 3;

  rows.push(
    `<tr class="desglose-total-gap" aria-hidden="true"><td colspan="${totalCols}"></td></tr>`,
    `<tr class="desglose-grand-total total-row">
      <td colspan="${totalLabelColspan}">
        <span class="desglose-grand-total__title">Total</span>
        <span class="desglose-grand-total__subtitle">Monto total estimado</span>
      </td>
      <td class="num">${escapeHtml(totalDisplay)}</td>
    </tr>`,
  );

  const headerPriceCols = includeUnitPrices
    ? `<th class="col-precio num">Precio unit.</th>
          <th class="col-subtotal num">Subtotal</th>`
    : `<th class="col-subtotal num">Subtotal</th>`;

  return `<div class="table-wrap table-wrap--desglose">
    <table class="data data--desglose">
      <thead>
        <tr>
          <th class="col-insumo">Insumo</th>
          <th class="col-cantidad num">Cantidad</th>
          <th class="col-unidad">Unidad</th>
          ${headerPriceCols}
        </tr>
      </thead>

      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  </div>`;
};

const pageFooter = (payload, pageLabel) => {
  const logoUrl = payload.logoUrl || "";
  const logoHtml = logoUrl
    ? `<img class="page__footer-logo" src="${escapeHtml(logoUrl)}" alt="SIEC" crossorigin="anonymous" />`
    : "";

  const brandRow = `
    <div class="page__footer-brand-row">
      ${logoHtml}
      <span class="page__footer-brand">${escapeHtml(payload.footerBrandName || 'SIEC')}</span>
    </div>`;

  return `
    <footer class="page__footer" role="contentinfo">
      <table class="page__footer-table" role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td class="page__footer-left-cell">${brandRow}</td>
          <td class="page__footer-section-cell">
            <div class="page__footer-section-row">
              <span>${escapeHtml(pageLabel)}</span>
            </div>
          </td>
        </tr>
      </table>
    </footer>
  `;
};

const buildDocumentReference = (payload) => {
  const d = payload.fechaExportacion ? new Date(payload.fechaExportacion) : new Date();
  if (Number.isNaN(d.getTime())) {
    return "PRES-REF";
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const slug = String(payload.projectName || "PROY")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();

  return `PRES-${y}${m}${day}-${slug || "PROY"}-${h}${min}`;
};

const renderPrintReviewBlock = () => `
  <div class="print-review">
    <h3 class="print-review__title">Registro de revisión (opcional — solo uso impreso)</h3>
    <p class="print-review__note">
      Complete a mano únicamente si necesita respaldo en terreno o archivo físico. No constituye firma electrónica ni contrato.
    </p>
    <div class="print-review__grid">
      <div class="print-review__field">
        <span class="print-review__label">Revisado por</span>
        <span class="print-review__line" aria-hidden="true"></span>
      </div>
      <div class="print-review__field">
        <span class="print-review__label">Fecha</span>
        <span class="print-review__line print-review__line--short" aria-hidden="true"></span>
      </div>
      <div class="print-review__field print-review__field--wide">
        <span class="print-review__label">Observaciones</span>
        <span class="print-review__line print-review__line--tall" aria-hidden="true"></span>
      </div>
    </div>
  </div>`;

const renderDocumentMeta = (payload, totalDisplay) => `
  <dl class="document-meta">
    <div class="document-meta__item">
      <dt>Emisor</dt>
      <dd>${escapeHtml(payload.businessName)}</dd>
    </div>
    <div class="document-meta__item">
      <dt>Proyecto</dt>
      <dd>${escapeHtml(payload.projectName)}</dd>
    </div>
    <div class="document-meta__item">
      <dt>Fecha de emisión</dt>
      <dd>${escapeHtml(formatExportDate(payload.fechaExportacion))}</dd>
    </div>
    <div class="document-meta__item">
      <dt>Referencia</dt>
      <dd>${escapeHtml(buildDocumentReference(payload))}</dd>
    </div>
    <div class="document-meta__item">
      <dt>Materialidad</dt>
      <dd>${escapeHtml(safeText(payload.materialNombre, "Por definir"))}</dd>
    </div>
    <div class="document-meta__item">
      <dt>Superficie</dt>
      <dd>${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</dd>
    </div>
    <div class="document-meta__item document-meta__item--accent">
      <dt>Total referencial</dt>
      <dd>${escapeHtml(totalDisplay)}</dd>
    </div>
  </dl>`;

const renderDocumentClosingPage = (payload, totalDisplay, { kicker = "03" } = {}) => {
  const reportFooterHtml = payload.reportFooter
    ? `<div class="report-footer-block"><p class="report-footer">${escapeHtml(payload.reportFooter)}</p></div>`
    : "";

  const printBlock =
    payload.includePrintReviewBlock === true ? renderPrintReviewBlock() : "";

  return `
    <section class="page page--closing" id="cierre">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">${escapeHtml(kicker)}</p>
            <h2 class="section-head__title">Validación y cierre del documento</h2>
          </div>
          <p class="section-head__note">Presupuesto referencial · trazabilidad y alcance.</p>
        </header>

        <div class="prose prose--closing">
          <p>
            Este documento fue generado con SIEC como <strong>presupuesto referencial</strong>.
            No constituye contrato de construcción, promesa de obra ni oferta vinculante.
          </p>
          <p>
            Los montos dependen de disponibilidad de insumos, condiciones de terreno, logística,
            mano de obra y validación técnica en terreno. Cualquier cambio de alcance debe
            documentarse en una nueva versión del presupuesto.
          </p>
        </div>

        ${renderDocumentMeta(payload, totalDisplay)}
        ${reportFooterHtml}
        ${printBlock}

        <p class="closing-generated">
          Documento generado con SIEC · Inteligencia constructiva
        </p>
      </div>
      ${pageFooter(payload, "Cierre")}
    </section>`;
};

const renderCoverHeader = (payload) => {
  const logoUrl = payload.logoUrl || resolveBrandLogoUrl();

  const markHtml = payload.includeLogo
    ? `<img class="cover__logo" src="${escapeHtml(logoUrl)}" alt="Logo SIEC" crossorigin="anonymous" />`
    : "";

  return `<header class="cover__header">
    <div class="cover__header-brand">
      ${markHtml}

      <div>
        <p class="cover__company">${escapeHtml(payload.businessName)}</p>
        <p class="cover__company-sub">Inteligencia constructiva</p>
      </div>
    </div>

    <p class="cover__header-date">${escapeHtml(formatExportDate(payload.fechaExportacion))}</p>
  </header>`;
};

const renderMetricsStrip = (payload, totalDisplay) => {
  return `<div class="metrics-strip">
    <article class="metric">
      <p class="metric__label">Superficie</p>
      <p class="metric__value">${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</p>
    </article>

    <article class="metric">
      <p class="metric__label">Materialidad</p>
      <p class="metric__value">${escapeHtml(safeText(payload.materialNombre, "Por definir"))}</p>
    </article>

    <article class="metric metric--accent">
      <p class="metric__label">Inversión</p>
      <p class="metric__value">${escapeHtml(totalDisplay)}</p>
    </article>
  </div>`;
};

const renderExecutiveSummary = (payload, projectName, totalDisplay) => {
  return `<div class="executive-summary">
    <div class="prose">
      <p>
        Estimación comercial para <strong>${escapeHtml(projectName)}</strong>, con una superficie calculada de
        <strong>${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</strong> y materialidad
        <strong>${escapeHtml(payload.materialNombre || "por definir")}</strong>.
      </p>

      <p>
        Este documento consolida antecedentes del proyecto, resumen económico, desglose de insumos,
        condiciones comerciales y anexos para revisión del cliente.
      </p>

      <p>
        Los valores se presentan como referencia comercial y deben validarse contra disponibilidad real,
        logística de obra, transporte, mano de obra y condiciones técnicas del terreno.
      </p>
    </div>

    <aside class="executive-total">
      <p class="executive-total__label">Total estimado</p>
      <p class="executive-total__value">${escapeHtml(totalDisplay)}</p>
    </aside>
  </div>`;
};

const renderAnnexes = (payload) => {
  const includeSnapshots = payload.includeSnapshots !== false;
  const annexSceneHtml =
    includeSnapshots && payload.sceneImageDataUrl
      ? `<figure class="annex-figure">
        <img src="${escapeHtml(payload.sceneImageDataUrl)}" alt="Vista 3D del proyecto" />
        <figcaption>Anexo A — Vista 3D del modelo.</figcaption>
      </figure>`
      : includeSnapshots
        ? '<p class="placeholder">Anexo A · Vista 3D no capturada. Exporte desde el editor con la escena 3D visible.</p>'
        : '<p class="placeholder">Anexo A · Capturas omitidas según preferencias de exportación.</p>';

  return `
    ${annexSceneHtml}

    <div class="annex-grid">
      <article class="annex-card">
        <p class="annex-card__label">Anexo B</p>
        <p class="annex-card__text">
          Planos técnicos, cortes, elevaciones o archivos DWG/PDF deben adjuntarse según etapa de diseño.
        </p>
      </article>

      <article class="annex-card">
        <p class="annex-card__label">Anexo C</p>
        <p class="annex-card__text">
          Observaciones técnicas, restricciones de obra, logística y criterios de coordinación con el cliente.
        </p>
      </article>
    </div>
  `;
};

/**
 * HTML del artículo para PDF vectorial (Chromium print vía backend Playwright).
 *
 * Importante:
 * - Cada section.page mide exactamente A4.
 * - Saltos de página con .pdf-page-break / page-break CSS.
 */
/** PDF compacto: portada, desglose, captura opcional, cierre documental. */
export const buildProposalArticleHtmlCompact = (payload) => {
  const {
    projectName,
    coverHeadline,
    totalFormatted: totalDisplay,
    materialNombre,
  } = payload;

  const desgloseTable = renderDesgloseTable(payload.desglose, payload);
  const coverHeader = renderCoverHeader(payload);

  const includeSnapshots = payload.includeSnapshots !== false;
  const snapshotSection =
    includeSnapshots
      ? `${pageBreak}
    <section class="page page--compact-scene">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">03</p>
            <h2 class="section-head__title">Vista del proyecto</h2>
          </div>
          <p class="section-head__note">Captura referencial del modelo 3D.</p>
        </header>
        ${
          payload.sceneImageDataUrl
            ? `<figure class="annex-figure annex-figure--compact">
              <img src="${escapeHtml(payload.sceneImageDataUrl)}" alt="Vista 3D del proyecto" />
              <figcaption>Vista 3D generada desde el editor.</figcaption>
            </figure>`
            : '<p class="placeholder">Vista 3D no capturada. Exporte con la escena 3D visible en el editor.</p>'
        }
      </div>
      ${pageFooter(payload, "Vista 3D")}
    </section>`
      : "";

  const closingKicker = includeSnapshots ? "04" : "03";

  return `<article class="proposal">
    <section class="page page--cover">
      ${coverHeader}

      <div class="cover__main">
        <p class="cover__label">${escapeHtml(coverHeadline)}</p>
        <h1 class="cover__title">${escapeHtml(projectName)}</h1>
        <p class="cover__lead">
          Presupuesto referencial · ${escapeHtml(materialNombre)} · Precios al ${escapeHtml(formatExportDate(payload.fechaPrecios))}
        </p>
      </div>

      <div class="cover__bottom">
        <dl class="cover__meta">
          <div>
            <dt>Fecha</dt>
            <dd>${escapeHtml(formatExportDate(payload.fechaExportacion))}</dd>
          </div>

          <div>
            <dt>Superficie</dt>
            <dd>${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</dd>
          </div>

          <div>
            <dt>Distribución</dt>
            <dd>${escapeHtml(formatRecintosSummary(payload.counts))}</dd>
          </div>
        </dl>

        <aside class="cover__total">
          <p class="cover__total-label">Inversión estimada</p>
          <p class="cover__total-value">${escapeHtml(totalDisplay)}</p>
          <p class="cover__total-note">
            Valor referencial sujeto a validación técnica y disponibilidad de insumos.
          </p>
        </aside>
      </div>
    </section>

    ${pageBreak}

    <section class="page page--compact-desglose" id="desglose">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">02</p>
            <h2 class="section-head__title">Desglose de insumos</h2>
          </div>
          <p class="section-head__note">Detalle referencial por categoría.</p>
        </header>
        ${desgloseTable}
      </div>
      ${pageFooter(payload, "Desglose")}
    </section>

    ${snapshotSection}

    ${pageBreak}

    ${renderDocumentClosingPage(payload, totalDisplay, { kicker: closingKicker })}
  </article>`;
};

export const buildProposalArticleHtml = (payload) => {
  const {
    projectName,
    coverHeadline,
    totalFormatted: totalDisplay,
    materialNombre,
    reportFooter,
  } = payload;

  const tocItems = PROPOSAL_SECTIONS.map(
    (section, index) =>
      `<li class="toc__item">
        <span class="toc__num">${String(index + 1).padStart(2, "0")}</span>
        <a href="#${section.id}">${escapeHtml(section.label)}</a>
      </li>`,
  ).join("");

  const termsHtml = DEFAULT_COMMERCIAL_TERMS.map(
    (term) => `
      <article class="terms__block">
        <h3>${escapeHtml(term.title)}</h3>
        <p>${escapeHtml(term.text)}</p>
      </article>`,
  ).join("");

  const reportFooterHtml = reportFooter
    ? `<p class="report-footer">${escapeHtml(reportFooter)}</p>`
    : "";

  const financialTable = renderFinancialTable(payload);
  const desgloseTable = renderDesgloseTable(payload.desglose, payload);
  const coverHeader = renderCoverHeader(payload);
  const metricsStrip = renderMetricsStrip(payload, totalDisplay);

  return `<article class="proposal">
    <section class="page page--cover">
      ${coverHeader}

      <div class="cover__main">
        <p class="cover__label">${escapeHtml(coverHeadline)}</p>
        <h1 class="cover__title">${escapeHtml(projectName)}</h1>
        <p class="cover__lead">
          Presupuesto referencial · ${escapeHtml(materialNombre)} · Precios al ${escapeHtml(formatExportDate(payload.fechaPrecios))}
        </p>
      </div>

      <div class="cover__bottom">
        <dl class="cover__meta">
          <div>
            <dt>Fecha</dt>
            <dd>${escapeHtml(formatExportDate(payload.fechaExportacion))}</dd>
          </div>

          <div>
            <dt>Superficie</dt>
            <dd>${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</dd>
          </div>

          <div>
            <dt>Precios al</dt>
            <dd>${escapeHtml(formatExportDate(payload.fechaPrecios))}</dd>
          </div>

          <div>
            <dt>Recintos</dt>
            <dd>${escapeHtml(formatRecintosSummary(payload.counts))}</dd>
          </div>
        </dl>

        <aside class="cover__total">
          <p class="cover__total-label">Inversión estimada</p>

          <p class="cover__total-value">${escapeHtml(totalDisplay)}</p>

          <p class="cover__total-note">
            Valor referencial sujeto a validación técnica, disponibilidad de insumos,
            transporte y condiciones reales de obra.
          </p>
        </aside>
      </div>
    </section>

    ${pageBreak}

    <section class="page">
      <div class="page__inner">
        <h2 class="toc__title">Índice</h2>
        <p class="toc__subtitle">
          Contenido de la propuesta para revisión ejecutiva, técnica y presupuestaria.
        </p>
        <ol class="toc__list">${tocItems}</ol>
      </div>

      ${pageFooter(payload, "Índice")}
    </section>

    ${pageBreak}

    <section class="page" id="resumen">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">01</p>
            <h2 class="section-head__title">Resumen ejecutivo</h2>
          </div>

          <p class="section-head__note">Vista consolidada de alcance, materialidad y monto estimado.</p>
        </header>

        ${metricsStrip}
        ${renderExecutiveSummary(payload, projectName, totalDisplay)}
        ${financialTable}
      </div>

      ${pageFooter(payload, "Resumen ejecutivo")}
    </section>

    ${pageBreak}

    <section class="page" id="proyecto">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">02</p>
            <h2 class="section-head__title">Antecedentes del proyecto</h2>
          </div>

          <p class="section-head__note">Datos base utilizados para generar esta propuesta.</p>
        </header>

        <div class="cards">
          <article class="card card--wide">
            <p class="card__label">Proyecto</p>
            <p class="card__value">${escapeHtml(projectName)}</p>
          </article>

          <article class="card">
            <p class="card__label">Material</p>
            <p class="card__value">${escapeHtml(safeText(payload.materialNombre))}</p>
          </article>

          <article class="card">
            <p class="card__label">Superficie</p>
            <p class="card__value">${escapeHtml(formatNumber(payload.m2Totales, 0))} m²</p>
          </article>

          <article class="card">
            <p class="card__label">Precios al</p>
            <p class="card__value">${escapeHtml(formatExportDate(payload.fechaPrecios))}</p>
          </article>

          <article class="card">
            <p class="card__label">Recintos</p>
            <p class="card__value">${escapeHtml(formatRecintosSummary(payload.counts))}</p>
          </article>
        </div>
      </div>

      ${pageFooter(payload, "Antecedentes")}
    </section>

    ${pageBreak}

    <section class="page" id="economico">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">03</p>
            <h2 class="section-head__title">Resumen económico</h2>
          </div>

          <p class="section-head__note">Montos agregados y ajustes comerciales aplicados.</p>
        </header>

        ${financialTable}
        ${reportFooterHtml}
      </div>

      ${pageFooter(payload, "Resumen económico")}
    </section>

    ${pageBreak}

    <section class="page" id="desglose">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">04</p>
            <h2 class="section-head__title">Desglose de insumos</h2>
          </div>

          <p class="section-head__note">Detalle referencial por categoría de insumos.</p>
        </header>

        ${desgloseTable}
      </div>

      ${pageFooter(payload, "Desglose")}
    </section>

    ${pageBreak}

    <section class="page" id="condiciones">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">05</p>
            <h2 class="section-head__title">Condiciones comerciales</h2>
          </div>

          <p class="section-head__note">Criterios de validez, alcance y responsabilidades.</p>
        </header>

        <div class="terms-grid">
          ${termsHtml}
        </div>
      </div>

      ${pageFooter(payload, "Condiciones")}
    </section>

    ${pageBreak}

    ${renderDocumentClosingPage(payload, totalDisplay, { kicker: "06" })}

    ${pageBreak}

    <section class="page" id="anexos">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">07</p>
            <h2 class="section-head__title">Anexos</h2>
          </div>

          <p class="section-head__note">Material complementario para revisión técnica.</p>
        </header>

        ${renderAnnexes(payload)}
      </div>

      ${pageFooter(payload, "Anexos")}
    </section>
  </article>`;
};

export const buildProposalHtml = (rawPayload, options = {}) => {
  const payload = normalizeProposalPayload(rawPayload);
  const compact = options.compact !== false;
  const articleHtml = compact
    ? buildProposalArticleHtmlCompact(payload)
    : buildProposalArticleHtml(payload);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=794, initial-scale=1" />
  <style>${PROPOSAL_CSS}</style>
</head>

<body class="${payload.pdfWatermark ? "pdf-watermark" : ""}">
  ${articleHtml}
</body>
</html>`;
};
