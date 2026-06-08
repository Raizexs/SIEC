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
  resolveBrandSignatureUrl,
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
  const normalized = normalizeDesglose(desglose);

  if (!normalized.length) {
    return '<p class="placeholder">No hay insumos en el desglose para este proyecto.</p>';
  }

  const rows = [];

  for (const category of normalized) {
    rows.push(
      `<tr class="cat-band">
        <td colspan="5">
          ${escapeHtml(category.categoria)} · Subtotal: ${escapeHtml(formatClp(category.subtotal_categoria))}
        </td>
      </tr>`,
    );

    for (const item of category.items || []) {
      rows.push(`<tr class="desglose-item">
        <td>${escapeHtml(item.insumo || "—")}</td>
        <td class="num">${escapeHtml(formatNumber(item.cantidad))}</td>
        <td>${escapeHtml(item.unidad || "—")}</td>
        <td class="num">${escapeHtml(formatClp(item.precio_unitario))}</td>
        <td class="num">${escapeHtml(formatClp(item.subtotal))}</td>
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

  rows.push(
    `<tr class="desglose-total-gap" aria-hidden="true"><td colspan="5"></td></tr>`,
    `<tr class="desglose-grand-total total-row">
      <td colspan="4">
        <span class="desglose-grand-total__title">Total</span>
        <span class="desglose-grand-total__subtitle">Monto total estimado</span>
      </td>
      <td class="num">${escapeHtml(totalDisplay)}</td>
    </tr>`,
  );

  return `<div class="table-wrap table-wrap--desglose">
    <table class="data data--desglose">
      <thead>
        <tr>
          <th class="col-insumo">Insumo</th>
          <th class="col-cantidad num">Cantidad</th>
          <th class="col-unidad">Unidad</th>
          <th class="col-precio num">Precio unit.</th>
          <th class="col-subtotal num">Subtotal</th>
        </tr>
      </thead>

      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  </div>`;
};

const brandMarkImg = (className, alt, logoUrl) => {
  if (!logoUrl) return "";
  return `<img class="${className}" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(alt)}" crossorigin="anonymous" />`;
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
  const annexSceneHtml = payload.sceneImageDataUrl
    ? `<figure class="annex-figure">
        <img src="${escapeHtml(payload.sceneImageDataUrl)}" alt="Vista 3D del proyecto" />
        <figcaption>Anexo A — Vista 3D del modelo.</figcaption>
      </figure>`
    : '<p class="placeholder">Anexo A · Vista 3D no capturada. Exporte desde el editor con la escena 3D visible.</p>';

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
/** PDF compacto: portada + total, desglose de insumos, firmas (máx. 3 páginas). */
export const buildProposalArticleHtmlCompact = (payload) => {
  const {
    projectName,
    coverHeadline,
    totalFormatted: totalDisplay,
    materialNombre,
  } = payload;

  const desgloseTable = renderDesgloseTable(payload.desglose, payload);
  const coverHeader = renderCoverHeader(payload);

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
            <dt>Recintos</dt>
            <dd>Hab. ${payload.counts?.habitaciones ?? 0} · Baños ${payload.counts?.banios ?? 0}</dd>
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

    ${pageBreak}

    <section class="page" id="firmas">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">03</p>
            <h2 class="section-head__title">Aceptación y firmas</h2>
          </div>
          <p class="section-head__note">Formalización de aceptación comercial.</p>
        </header>

        <div class="prose">
          <p>
            La aceptación se perfecciona con firma de ambas partes y anticipo acordado
            cuando corresponda. Cualquier cambio de alcance deberá documentarse mediante anexo o nueva versión.
          </p>
        </div>

        <div class="signatures">
          <div class="signature signature--client">
            <p class="signature__line">Por el cliente</p>
            <p class="signature__hint">Nombre, RUT y fecha</p>
          </div>

          <div class="signature signature--issuer">
            <div class="signature__mark-wrap">
              ${brandMarkImg(
                "signature__mark",
                "Firma SIEC",
                payload.signatureUrl || resolveBrandSignatureUrl(),
              )}
            </div>
            <p class="signature__line">Por ${escapeHtml(payload.businessName)}</p>
            <p class="signature__hint">Representante autorizado</p>
          </div>
        </div>
      </div>
      ${pageFooter(payload, "Firmas")}
    </section>
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
            <dd>Hab. ${payload.counts?.habitaciones ?? 0} · Baños ${payload.counts?.banios ?? 0}</dd>
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
            <p class="card__value">Hab. ${payload.counts?.habitaciones ?? 0} · Baños ${payload.counts?.banios ?? 0}</p>
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

    <section class="page" id="firmas">
      <div class="page__inner">
        <header class="section-head">
          <div>
            <p class="section-head__kicker">06</p>
            <h2 class="section-head__title">Aceptación y firmas</h2>
          </div>

          <p class="section-head__note">Formalización de aceptación comercial.</p>
        </header>

        <div class="prose">
          <p>
            La aceptación se perfecciona con firma de ambas partes y anticipo acordado
            cuando corresponda. Cualquier cambio de alcance deberá documentarse mediante anexo o nueva versión.
          </p>
        </div>

        <div class="signatures">
          <div class="signature signature--client">
            <p class="signature__line">Por el cliente</p>
            <p class="signature__hint">Nombre, RUT y fecha</p>
          </div>

          <div class="signature signature--issuer">
            <div class="signature__mark-wrap">
              ${brandMarkImg(
                "signature__mark",
                "Firma SIEC",
                payload.signatureUrl || resolveBrandSignatureUrl(),
              )}
            </div>
            <p class="signature__line">Por ${escapeHtml(payload.businessName)}</p>
            <p class="signature__hint">Representante autorizado</p>
          </div>
        </div>
      </div>

      ${pageFooter(payload, "Firmas")}
    </section>

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
