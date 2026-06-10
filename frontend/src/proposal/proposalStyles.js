/**
 * proposalStyles.js
 *
 * CSS premium para propuestas comerciales SIEC.
 *
 * Enfoque:
 * - Documento A4 estable para Chromium/Playwright.
 * - Estética slate/orange consistente con la UI premium.
 * - Portada tipo dossier ejecutivo.
 * - Tablas de alto contraste, legibles en PDF.
 * - CSS aislado bajo .proposal para no contaminar la app.
 */

export const PROPOSAL_CSS = `
  :root {
    --siec-ink: #0f172a;
    --siec-ink-2: #1e293b;
    --siec-slate: #334155;
    --siec-muted: #64748b;
    --siec-muted-2: #94a3b8;
    --siec-line: #dbe3ee;
    --siec-line-2: #e8eef6;
    --siec-paper: #ffffff;
    --siec-tonal: #f8fafc;
    --siec-tonal-2: #f1f5f9;
    --siec-orange: #f97316;
    --siec-orange-2: #fb923c;
    --siec-orange-soft: #fff7ed;
    --siec-orange-line: #fed7aa;
    --siec-emerald: #059669;
    --siec-emerald-soft: #ecfdf5;
    --siec-amber: #b45309;
    --siec-amber-soft: #fffbeb;
    --siec-red: #dc2626;
    --siec-red-soft: #fef2f2;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .proposal,
  .proposal * {
    box-sizing: border-box;
  }

  .proposal {
    width: 210mm;
    margin: 0 auto;
    background: var(--siec-paper);
    color: var(--siec-slate);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 10.2pt;
    line-height: 1.5;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }

  .proposal p,
  .proposal h1,
  .proposal h2,
  .proposal h3,
  .proposal dl,
  .proposal dt,
  .proposal dd,
  .proposal ol,
  .proposal li,
  .proposal figure {
    margin: 0;
    padding: 0;
  }

  .proposal strong {
    color: var(--siec-ink);
    font-weight: 900;
  }

  .proposal .pdf-page-break,
  .proposal .html2pdf__page-break {
    display: block;
    height: 0;
    overflow: hidden;
    page-break-before: always;
    break-before: page;
  }

  .proposal .page:not(.page--cover) {
    position: relative;
    display: block;
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--siec-paper);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .proposal .page:not(.page--cover)::before {
    display: none;
  }

  .proposal .page:not(.page--cover) .page__inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 14mm;
    z-index: 1;
    overflow: hidden;
    box-sizing: border-box;
    padding: 17mm 18mm 6mm;
  }

  .proposal .page:not(.page--cover) .page__footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 12;
    height: 14mm;
    min-height: 14mm;
    max-height: 14mm;
    padding: 0 18mm;
    box-sizing: border-box;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .proposal .page__footer-table {
    width: 100%;
    height: 14mm;
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: fixed;
  }

  .proposal .page__footer-table tr {
    height: 14mm;
  }

  .proposal .page__footer-table td {
    height: 14mm;
    padding: 0;
    margin: 0;
    vertical-align: middle;
    text-align: left;
  }

  .proposal .page__footer-left-cell {
    width: auto;
    vertical-align: middle;
  }

  .proposal .page__footer-brand-row {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 2.5mm;
    height: 7mm;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .proposal .page__footer-logo {
    display: block;
    flex: 0 0 7mm;
    width: 7mm;
    height: 7mm;
    margin: 0;
    padding: 0;
    border: 0;
    object-fit: contain;
    /* El glifo del SVG queda alto en el viewBox; bajar para centrar con el texto */
    transform: translateY(1.2mm);
  }

  .proposal .page__footer-brand {
    flex: 0 0 auto;
    margin: 0;
    padding: 0;
    color: #0f172a;
    font-size: 9pt;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .proposal .page__footer-section-cell {
    width: auto;
    vertical-align: middle;
    text-align: right;
  }

  .proposal .page__footer-section-row {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
    height: 7mm;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    color: #475569;
    font-size: 9pt;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }

  /* ─────────────────────────────────────────────
     Cover
     ───────────────────────────────────────────── */

  .proposal .page--cover {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    padding: 0;
    overflow: hidden;
    box-sizing: border-box;
    color: #0f172a;
    background: #ffffff;
  }

  .proposal .page--cover::before,
  .proposal .page--cover::after {
    display: none;
  }

  .proposal .cover__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8mm;
    padding: 16mm 18mm 10mm;
    border-bottom: 1px solid #e2e8f0;
  }

  .proposal .cover__header-brand {
    display: flex;
    align-items: center;
    gap: 4mm;
    min-width: 0;
  }

  .proposal .cover__logo {
    width: 14mm;
    height: 14mm;
    flex-shrink: 0;
    object-fit: contain;
  }

  .proposal .cover__company {
    margin: 0;
    color: #0f172a;
    font-size: 10.5pt;
    font-weight: 700;
    line-height: 1.25;
  }

  .proposal .cover__company-sub {
    margin: 1mm 0 0;
    color: #64748b;
    font-size: 7.5pt;
    font-weight: 500;
    line-height: 1.3;
  }

  .proposal .cover__header-date {
    margin: 0;
    flex-shrink: 0;
    color: #64748b;
    font-size: 8pt;
    font-weight: 500;
    line-height: 1.35;
    text-align: right;
  }

  .proposal .cover__main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 14mm 18mm 12mm;
    border-bottom: 1px solid #e2e8f0;
  }

  .proposal .cover__label {
    margin: 0 0 4mm;
    color: #64748b;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .proposal .cover__title {
    margin: 0;
    max-width: 100%;
    color: #0f172a;
    font-size: 28pt;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  .proposal .cover__lead {
    margin: 6mm 0 0;
    max-width: 150mm;
    color: #475569;
    font-size: 10.5pt;
    font-weight: 500;
    line-height: 1.5;
  }

  .proposal .cover__bottom {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 68mm;
    gap: 8mm;
    align-items: stretch;
    padding: 10mm 18mm 14mm;
    background: #f8fafc;
  }

  .proposal .cover__meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    margin: 0;
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 3mm;
    background: #ffffff;
    overflow: hidden;
  }

  .proposal .cover__meta > div {
    min-width: 0;
    padding: 4mm 5mm;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
  }

  .proposal .cover__meta > div:nth-child(2n) {
    border-right: none;
  }

  .proposal .cover__meta > div:nth-last-child(-n + 2) {
    border-bottom: none;
  }

  .proposal .cover__meta dt {
    margin: 0;
    color: #64748b;
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .proposal .cover__meta dd {
    margin: 1.5mm 0 0;
    color: #0f172a;
    font-size: 9.5pt;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .proposal .cover__total {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 100%;
    padding: 5mm 6mm;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--siec-orange);
    border-radius: 3mm;
    background: #ffffff;
  }

  .proposal .cover__total-label {
    margin: 0;
    color: #64748b;
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .proposal .cover__total-value {
    margin: 3mm 0 0;
    color: #0f172a;
    font-size: 17pt;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .proposal .cover__total-note {
    margin: 3mm 0 0;
    color: #64748b;
    font-size: 7.2pt;
    font-weight: 500;
    line-height: 1.45;
  }

  /* ─────────────────────────────────────────────
     TOC
     ───────────────────────────────────────────── */

  .proposal .toc__title {
    margin-bottom: 8mm;
    color: var(--siec-ink);
    font-size: 22pt;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .proposal .toc__subtitle {
    max-width: 128mm;
    margin-bottom: 9mm;
    color: var(--siec-muted);
    font-size: 10pt;
    font-weight: 650;
    line-height: 1.55;
  }

  .proposal .toc__list {
    list-style: none;
  }

  .proposal .toc__item {
    display: flex;
    align-items: baseline;
    gap: 4mm;
    padding: 4mm 0;
    border-bottom: 1px dotted var(--siec-line);
    font-size: 10.5pt;
  }

  .proposal .toc__item a {
    flex: 1;
    color: var(--siec-ink);
    text-decoration: none;
    font-weight: 850;
  }

  .proposal .toc__num {
    min-width: 9mm;
    color: var(--siec-orange);
    font-weight: 900;
  }

  /* ─────────────────────────────────────────────
     Interior
     ───────────────────────────────────────────── */

  .proposal .section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6mm;
    margin-bottom: 6mm;
    padding-bottom: 3.5mm;
    border-bottom: 2px solid var(--siec-orange);
  }

  .proposal .section-head__kicker {
    margin-bottom: 2mm;
    color: var(--siec-orange);
    font-size: 7pt;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .proposal .section-head__title {
    color: var(--siec-ink);
    font-size: 18pt;
    font-weight: 900;
    line-height: 1.12;
    letter-spacing: -0.035em;
  }

  .proposal .section-head__note {
    max-width: 58mm;
    color: var(--siec-muted);
    font-size: 7.8pt;
    font-weight: 700;
    line-height: 1.45;
    text-align: right;
  }

  .proposal .prose {
    color: var(--siec-slate);
    font-size: 10.2pt;
  }

  .proposal .prose p {
    margin-bottom: 3.5mm;
    text-align: justify;
    hyphens: auto;
  }

  .proposal .prose p:last-child {
    margin-bottom: 0;
  }

  .proposal .executive-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 58mm;
    gap: 5mm;
    align-items: stretch;
    margin-bottom: 6mm;
  }

  .proposal .executive-summary .prose {
    padding: 5mm;
    border: 1px solid var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
  }

  .proposal .executive-total {
    position: relative;
    overflow: hidden;
    border-radius: 5mm;
    background:
      radial-gradient(circle at top right, rgba(249, 115, 22, 0.22), transparent 48%),
      var(--siec-ink);
    color: #ffffff;
    padding: 5mm;
  }

  .proposal .executive-total::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 1.6mm;
    background: linear-gradient(180deg, #fdba74, var(--siec-orange));
  }

  .proposal .executive-total__label {
    color: #fdba74;
    font-size: 7pt;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .proposal .executive-total__value {
    margin-top: 3mm;
    color: #ffffff;
    font-size: 15pt;
    font-weight: 900;
    line-height: 1.08;
    overflow-wrap: anywhere;
  }

  .proposal .metrics-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3mm;
    margin: 0 0 6mm;
  }

  .proposal .metric {
    min-height: 22mm;
    border: 1px solid var(--siec-line);
    border-radius: 4mm;
    background: #ffffff;
    padding: 3.5mm;
  }

  .proposal .metric--accent {
    border-color: var(--siec-orange-line);
    background: var(--siec-orange-soft);
  }

  .proposal .metric__label,
  .proposal .card__label {
    color: var(--siec-muted);
    font-size: 6.8pt;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .proposal .metric__value,
  .proposal .card__value {
    margin-top: 1.6mm;
    color: var(--siec-ink);
    font-size: 11pt;
    font-weight: 900;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .proposal .metric--accent .metric__label,
  .proposal .metric--accent .metric__value {
    color: #9a3412;
  }

  .proposal .cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4mm;
    margin: 5mm 0;
  }

  .proposal .card {
    border: 1px solid var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
    padding: 4mm;
  }

  .proposal .card--wide {
    grid-column: 1 / -1;
  }

  /* ─────────────────────────────────────────────
     Tables
     ───────────────────────────────────────────── */

  .proposal .table-wrap {
    margin: 4mm 0;
    border: 1px solid var(--siec-line);
    border-radius: 4mm;
    overflow: hidden;
    background: #ffffff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .proposal table.data {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    background: #ffffff;
    color: var(--siec-slate);
    font-size: 8.4pt;
  }

  .proposal table.data th {
    background: var(--siec-ink);
    color: #ffffff;
    text-align: left;
    padding: 3mm 3.2mm;
    font-size: 6.8pt;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.35;
  }

  .proposal table.data td {
    padding: 3.1mm 3.2mm;
    border-bottom: 1px solid var(--siec-line);
    vertical-align: middle;
    background: #ffffff;
    color: var(--siec-slate);
    font-weight: 750;
    line-height: 1.48;
    overflow-wrap: anywhere;
  }

  .proposal table.data tr:nth-child(even) td {
    background: var(--siec-tonal);
  }

  .proposal table.data .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .proposal table.data .col-insumo {
    width: 42%;
  }

  .proposal table.data a.insumo-link {
    color: #c2410c;
    font-weight: 700;
    text-decoration: underline;
    text-decoration-color: rgba(194, 65, 12, 0.35);
    text-underline-offset: 2px;
  }

  .proposal table.data a.insumo-link:hover {
    color: #9a3412;
    text-decoration-color: rgba(154, 52, 18, 0.55);
  }

  .proposal table.data .col-cantidad {
    width: 14%;
  }

  .proposal table.data .col-unidad {
    width: 16%;
  }

  .proposal table.data .col-precio {
    width: 14%;
  }

  .proposal table.data .col-subtotal {
    width: 14%;
  }

  .proposal .cat-band td {
    background: var(--siec-orange-soft) !important;
    color: var(--siec-ink) !important;
    border-bottom: 1px solid var(--siec-orange-line);
    font-size: 8.6pt;
    font-weight: 900;
    line-height: 1.4;
    padding-top: 3.4mm;
    padding-bottom: 3.4mm;
  }

  .proposal table.data tbody tr.cat-band:not(:first-child) td {
    padding-top: 5mm;
    border-top: 2px solid var(--siec-line-2);
  }

  .proposal table.data tbody tr.desglose-item td {
    padding-top: 3.2mm;
    padding-bottom: 3.2mm;
  }

  .proposal .desglose-total-gap td {
    height: 5mm;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
  }

  .proposal .desglose-grand-total td {
    padding-top: 4.2mm !important;
    padding-bottom: 4.2mm !important;
    border-top: 2px solid var(--siec-emerald);
    border-bottom: none;
  }

  .proposal .desglose-grand-total__title {
    display: block;
    color: var(--siec-ink);
    font-size: 9.6pt;
    font-weight: 900;
    line-height: 1.3;
  }

  .proposal .desglose-grand-total__subtitle {
    display: block;
    margin-top: 0.8mm;
    color: var(--siec-muted);
    font-size: 7.6pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1.35;
  }

  .proposal .desglose-grand-total td.num {
    font-size: 10.4pt;
    font-weight: 900;
    vertical-align: middle;
  }

  .proposal .total-row td {
    background: var(--siec-emerald-soft) !important;
    color: var(--siec-emerald) !important;
    font-size: 9.3pt;
    font-weight: 900;
  }

  /* ─────────────────────────────────────────────
     Terms / signatures / annexes
     ───────────────────────────────────────────── */

  .proposal .terms-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
  }

  .proposal .terms__block {
    min-height: 31mm;
    padding: 4mm 4mm 4mm 5mm;
    border-left: 3px solid var(--siec-orange);
    border-radius: 0 4mm 4mm 0;
    background: var(--siec-tonal);
    break-inside: avoid;
  }

  .proposal .terms__block h3 {
    margin-bottom: 2mm;
    color: var(--siec-ink);
    font-size: 10pt;
    font-weight: 900;
  }

  .proposal .terms__block p {
    color: var(--siec-slate);
    font-size: 8.7pt;
    font-weight: 650;
    line-height: 1.48;
  }

  .proposal .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12mm;
    margin-top: 16mm;
  }

  .proposal .signature {
    display: flex;
    flex-direction: column;
    min-height: 52mm;
    border: 1px solid var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
    padding: 5mm;
  }

  .proposal .signature--client .signature__line {
    margin-top: auto;
    padding-top: 20mm;
  }

  .proposal .signature--issuer {
    min-height: 52mm;
  }

  .proposal .signature--issuer .signature__mark-wrap {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 34mm;
    margin-bottom: 2mm;
  }

  .proposal .signature--issuer .signature__mark {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 34mm;
    max-width: 100%;
    object-fit: contain;
    object-position: center center;
  }

  .proposal .signature--issuer .signature__line {
    margin-top: 0;
    flex-shrink: 0;
  }

  .proposal .signature__line {
    padding-top: 2mm;
    border-top: 1.4px solid var(--siec-slate);
    color: var(--siec-ink);
    font-size: 9pt;
    font-weight: 850;
  }

  .proposal .signature__hint {
    margin-top: 1mm;
    color: var(--siec-muted);
    font-size: 7.5pt;
  }

  .proposal .annex-figure {
    margin: 5mm 0;
    overflow: hidden;
    border: 1px solid var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
  }

  .proposal .annex-figure img {
    display: block;
    width: 100%;
    max-height: 122mm;
    object-fit: contain;
    background: #ffffff;
  }

  .proposal .annex-figure figcaption {
    padding: 3mm 4mm;
    border-top: 1px solid var(--siec-line);
    color: var(--siec-muted);
    font-size: 8.2pt;
    font-weight: 650;
  }

  .proposal .report-footer {
    margin-top: 6mm;
    border: 1px solid var(--siec-orange-line);
    border-radius: 4mm;
    background: var(--siec-amber-soft);
    padding: 4mm;
    color: #92400e;
    font-size: 8.8pt;
    line-height: 1.5;
  }

  .proposal .placeholder {
    padding: 18mm 8mm;
    text-align: center;
    color: var(--siec-muted);
    font-size: 9.5pt;
    border: 2px dashed var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
  }

  .proposal .normativa-status {
    margin: 0 0 4mm;
    padding: 3mm 4mm;
    border-radius: 3mm;
    font-size: 9pt;
    font-weight: 600;
  }

  .proposal .normativa-status--ok {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .proposal .normativa-status--warn {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .proposal .normativa-list {
    margin: 0 0 4mm;
    padding: 0;
    list-style: none;
  }

  .proposal .normativa-item {
    margin: 0 0 2.5mm;
    padding: 3mm 4mm;
    border-radius: 3mm;
    font-size: 8.8pt;
    line-height: 1.45;
  }

  .proposal .normativa-item--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .proposal .normativa-item--warning {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
  }

  .proposal .normativa-item--info {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1e3a8a;
  }

  .proposal .normativa-footnote {
    margin: 4mm 0 0;
    font-size: 8pt;
    color: var(--siec-muted);
    line-height: 1.45;
  }

  .proposal .annex-card--wide {
    grid-column: 1 / -1;
  }

  .proposal .annex-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4mm;
    margin-top: 5mm;
  }

  .proposal .annex-card {
    border: 1px solid var(--siec-line);
    border-radius: 5mm;
    background: var(--siec-tonal);
    padding: 5mm;
  }

  .proposal .annex-card__label {
    color: var(--siec-orange);
    font-size: 7pt;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .proposal .annex-card__text {
    margin-top: 2mm;
    color: var(--siec-slate);
    font-size: 9pt;
    font-weight: 750;
    line-height: 1.45;
  }

  /* Hidden host for export */
  .siec-pdf-export-host {
    position: fixed !important;
    left: -100000px !important;
    top: 0 !important;
    z-index: -9999 !important;
    width: 210mm !important;
    height: auto !important;
    overflow: hidden !important;
    opacity: 1 !important;
    pointer-events: none !important;
    background: #ffffff !important;
  }

  .siec-pdf-export-host .proposal {
    width: 210mm !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: none !important;
  }

  @media print {
    html,
    body {
      width: 210mm;
      background: #ffffff;
    }

    .print-hint {
      display: none !important;
    }

    .proposal {
      width: 210mm;
      max-width: none;
      margin: 0;
      box-shadow: none;
    }

    .proposal .page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      overflow: hidden;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
  }

  .proposal .page--compact-desglose .page__inner {
    padding-top: 8mm;
  }

  .proposal .page--compact-desglose table.data {
    font-size: 8.2pt;
  }

  .proposal .page--compact-desglose table.data th {
    padding: 2.6mm 2.8mm;
  }

  .proposal .page--compact-desglose table.data td {
    padding: 2.7mm 2.8mm;
    line-height: 1.45;
  }

  .proposal .page--compact-desglose table.data tbody tr.cat-band:not(:first-child) td {
    padding-top: 4mm;
  }

  .proposal .page--compact-desglose table.data tbody tr.desglose-item td {
    padding-top: 2.8mm;
    padding-bottom: 2.8mm;
  }

  .proposal .page--compact-desglose .cat-band td {
    font-size: 8.4pt;
    padding-top: 3mm;
    padding-bottom: 3mm;
  }

  .proposal .page--compact-desglose .desglose-total-gap td {
    height: 4mm;
  }

  .proposal .page--compact-desglose .desglose-grand-total td {
    padding-top: 3.6mm !important;
    padding-bottom: 3.6mm !important;
  }

  .proposal .page--compact-desglose .desglose-grand-total td.num {
    font-size: 9.8pt;
  }

  .proposal .report-footer-block {
    margin: 5mm 0 4mm;
    padding: 3.5mm 4mm;
    border-radius: 2mm;
    background: rgba(248, 250, 252, 0.95);
    border: 1px solid rgba(15, 23, 42, 0.06);
  }

  .proposal .page--compact-scene .annex-figure--compact {
    margin-top: 4mm;
  }

  .proposal .page--compact-scene .annex-figure--compact img {
    max-height: 155mm;
    width: 100%;
    object-fit: contain;
    border-radius: 2mm;
    border: 1px solid rgba(15, 23, 42, 0.08);
  }

  .proposal .page--closing .prose--closing {
    margin-bottom: 5mm;
  }

  .proposal .page--closing .prose--closing p {
    margin-bottom: 2.5mm;
    font-size: 9.2pt;
    line-height: 1.45;
    color: rgba(15, 23, 42, 0.82);
  }

  .proposal .document-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5mm 4mm;
    margin: 4mm 0 5mm;
    padding: 4mm;
    border-radius: 2mm;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(248, 250, 252, 0.95);
  }

  .proposal .document-meta__item {
    min-width: 0;
  }

  .proposal .document-meta__item--accent {
    grid-column: 1 / -1;
    padding-top: 2mm;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
  }

  .proposal .document-meta dt {
    font-size: 7.2pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(100, 116, 139, 0.95);
  }

  .proposal .document-meta dd {
    margin: 0.8mm 0 0;
    font-size: 9.5pt;
    font-weight: 700;
    color: rgb(15, 23, 42);
  }

  .proposal .document-meta__item--accent dd {
    font-size: 11pt;
    font-weight: 800;
  }

  .proposal .print-review {
    margin-top: 4mm;
    padding: 4mm;
    border-radius: 2mm;
    border: 1px dashed rgba(100, 116, 139, 0.45);
    background: rgba(255, 255, 255, 0.92);
  }

  .proposal .print-review__title {
    margin: 0;
    font-size: 9pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgb(51, 65, 85);
  }

  .proposal .print-review__note {
    margin: 1.5mm 0 3mm;
    font-size: 8.2pt;
    line-height: 1.4;
    color: rgba(71, 85, 105, 0.95);
  }

  .proposal .print-review__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm;
  }

  .proposal .print-review__field--wide {
    grid-column: 1 / -1;
  }

  .proposal .print-review__label {
    display: block;
    margin-bottom: 1.2mm;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(100, 116, 139, 0.95);
  }

  .proposal .print-review__line {
    display: block;
    height: 7mm;
    border-bottom: 1px solid rgba(15, 23, 42, 0.35);
  }

  .proposal .print-review__line--short {
    width: 70%;
  }

  .proposal .print-review__line--tall {
    height: 14mm;
  }

  .proposal .closing-generated {
    margin-top: 4mm;
    font-size: 7.8pt;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(100, 116, 139, 0.9);
    text-align: center;
  }

  body.pdf-watermark .proposal .page {
    position: relative;
  }

  body.pdf-watermark .proposal .page::after {
    content: 'SIEC · Plan Free';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font: 700 42px/1 Helvetica, Arial, sans-serif;
    color: rgba(15, 23, 42, 0.1);
    pointer-events: none;
    z-index: 50;
    white-space: nowrap;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }
`;
