import QRCode from "qrcode";

/**
 * Genera un data URL PNG del código QR para la URL indicada.
 * @param {string} url
 * @param {number} [size=200]
 * @returns {Promise<string>}
 */
export async function generateQrDataUrl(url, size = 200) {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: {
      dark: "#0f2744",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
