/**
 * @typedef {Object} ProposalRoomCounts
 * @property {number} habitaciones
 * @property {number} banios
 */

/**
 * Payload normalizado consumido por buildProposalHtml (sin lógica defensiva en plantillas).
 * @typedef {Object} NormalizedProposalPayload
 * @property {string} projectName
 * @property {string} coverHeadline
 * @property {string} businessName
 * @property {string} footerBrandName
 * @property {string} reportFooter
 * @property {boolean} includeLogo
 * @property {string} logoUrl
 * @property {string} signatureUrl
 * @property {number} m2Totales
 * @property {number | string | null} materialEstructuralId
 * @property {string} materialNombre
 * @property {string} fechaPrecios ISO
 * @property {string} fechaExportacion ISO
 * @property {number} motorTotal
 * @property {number} contingencyPct
 * @property {number} deltaContingencia
 * @property {number} subtotalConContingencia
 * @property {number} montoIva
 * @property {number} totalPreferido
 * @property {string} totalFormatted
 * @property {boolean} includeTax
 * @property {Array} desglose
 * @property {ProposalRoomCounts} counts
 * @property {string | null} sceneImageDataUrl
 */

export {};
