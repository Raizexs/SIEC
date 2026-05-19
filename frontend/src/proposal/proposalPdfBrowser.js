import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_W_MM = 210;
const A4_H_MM = 297;

const FOOTER_H_PX = '53px';

/** Refuerza el pie de página al rasterizar (tabla + vertical-align para alineación fiable). */
const reinforcePdfFooters = (clonedDoc) => {
  clonedDoc.querySelectorAll('.proposal .page:not(.page--cover)').forEach((page) => {
    page.style.position = 'relative';
    page.style.display = 'block';
    page.style.width = '794px';
    page.style.height = '1123px';
    page.style.overflow = 'hidden';
    page.style.boxSizing = 'border-box';

    const inner = page.querySelector('.page__inner');
    if (inner) {
      inner.style.position = 'absolute';
      inner.style.top = '0';
      inner.style.left = '0';
      inner.style.right = '0';
      inner.style.bottom = FOOTER_H_PX;
      inner.style.overflow = 'hidden';
      inner.style.boxSizing = 'border-box';
    }
  });

  clonedDoc.querySelectorAll('.proposal .page__footer').forEach((footer) => {
    footer.style.position = 'absolute';
    footer.style.left = '0';
    footer.style.right = '0';
    footer.style.bottom = '0';
    footer.style.zIndex = '20';
    footer.style.display = 'block';
    footer.style.visibility = 'visible';
    footer.style.opacity = '1';
    footer.style.height = FOOTER_H_PX;
    footer.style.minHeight = FOOTER_H_PX;
    footer.style.maxHeight = FOOTER_H_PX;
    footer.style.margin = '0';
    footer.style.padding = `0 68px`;
    footer.style.boxSizing = 'border-box';
    footer.style.background = '#ffffff';
    footer.style.borderTop = '1px solid #e2e8f0';
    footer.style.webkitPrintColorAdjust = 'exact';
    footer.style.printColorAdjust = 'exact';

    const table = footer.querySelector('.page__footer-table');
    if (table) {
      table.style.width = '100%';
      table.style.height = FOOTER_H_PX;
      table.style.borderCollapse = 'collapse';
      table.style.borderSpacing = '0';
      table.style.tableLayout = 'fixed';
    }

    footer.querySelectorAll('.page__footer-table tr').forEach((row) => {
      row.style.height = FOOTER_H_PX;
    });

    footer.querySelectorAll('.page__footer-table td').forEach((cell) => {
      cell.style.height = FOOTER_H_PX;
      cell.style.padding = '0';
      cell.style.margin = '0';
      cell.style.verticalAlign = 'middle';
    });

    footer.querySelectorAll('.page__footer-brand-row').forEach((row) => {
      row.style.display = 'inline-flex';
      row.style.flexDirection = 'row';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'flex-start';
      row.style.gap = '8px';
      row.style.height = '26px';
      row.style.margin = '0';
      row.style.padding = '0';
      row.style.boxSizing = 'border-box';
    });

    footer.querySelectorAll('.page__footer-logo').forEach((img) => {
      img.style.display = 'block';
      img.style.flex = '0 0 26px';
      img.style.width = '26px';
      img.style.height = '26px';
      img.style.margin = '0';
      img.style.padding = '0';
      img.style.border = '0';
      img.style.objectFit = 'contain';
      img.style.transform = 'translateY(6.5px)';
    });

    footer.querySelectorAll('.page__footer-brand').forEach((el) => {
      el.style.color = '#0f172a';
      el.style.fontSize = '12px';
      el.style.fontWeight = '800';
      el.style.lineHeight = '1';
      el.style.letterSpacing = '0.04em';
      el.style.whiteSpace = 'nowrap';
    });

    footer.querySelectorAll('.page__footer-section-row').forEach((row) => {
      row.style.display = 'inline-flex';
      row.style.flexDirection = 'row';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'flex-end';
      row.style.width = '100%';
      row.style.height = '26px';
      row.style.margin = '0';
      row.style.padding = '0';
      row.style.boxSizing = 'border-box';
      row.style.color = '#475569';
      row.style.fontSize = '12px';
      row.style.fontWeight = '600';
      row.style.lineHeight = '1';
      row.style.whiteSpace = 'nowrap';
    });

    footer.querySelectorAll('.page__footer-section-cell').forEach((cell) => {
      cell.style.textAlign = 'right';
      cell.style.verticalAlign = 'middle';
    });
  });

  clonedDoc.querySelectorAll('.proposal .signature').forEach((box) => {
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.minHeight = '196px';
  });

  clonedDoc.querySelectorAll('.proposal .signature--issuer').forEach((box) => {
    box.style.minHeight = '196px';
  });

  clonedDoc
    .querySelectorAll('.proposal .signature--issuer .signature__mark-wrap')
    .forEach((wrap) => {
      wrap.style.flex = '1 1 auto';
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'center';
      wrap.style.width = '100%';
      wrap.style.minHeight = '128px';
      wrap.style.marginBottom = '8px';
    });

  clonedDoc.querySelectorAll('.proposal .signature__mark').forEach((img) => {
    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.minHeight = '128px';
    img.style.maxWidth = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center center';
  });
};

const waitForImages = (root) => {
  const images = [...(root?.querySelectorAll('img') || [])];
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
};

const mountProposalFrame = (html) =>
  new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'SIEC PDF');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-10000px;top:0;width:210mm;height:auto;border:0;opacity:0;pointer-events:none;';

    iframe.onload = () => {
      const doc = iframe.contentDocument;
      if (!doc) {
        iframe.remove();
        reject(new Error('No se pudo preparar el documento PDF.'));
        return;
      }
      resolve({ iframe, doc });
    };

    iframe.onerror = () => {
      iframe.remove();
      reject(new Error('Error al cargar la plantilla del PDF.'));
    };

    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      reject(new Error('El navegador bloqueó la generación del PDF.'));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  });

/**
 * Descarga automática en el navegador (alta resolución, diseño premium HTML/CSS).
 * Una página A4 = un canvas → evita cortes raros en documentos largos.
 */
export const downloadProposalPdfInBrowser = async (html, filename) => {
  const { iframe, doc } = await mountProposalFrame(html);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await waitForImages(doc);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const pages = [...doc.querySelectorAll('.proposal .page')];
    if (!pages.length) {
      throw new Error('El documento de propuesta no tiene páginas para exportar.');
    }

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
    });

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = pages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: pageEl.offsetWidth,
        height: pageEl.offsetHeight,
        windowWidth: pageEl.offsetWidth,
        windowHeight: pageEl.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: reinforcePdfFooters,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.94);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, A4_H_MM, undefined, 'FAST');
    }

    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeName);
  } finally {
    iframe.remove();
  }
};
