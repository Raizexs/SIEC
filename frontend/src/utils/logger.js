/**
 * Logger utilitario para centralizar la salida por consola en el Frontend.
 * Evita la impresión de información innecesaria en el entorno de producción.
 */

const isProduction = import.meta.env.PROD;

const logger = {
  info: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  debug: (...args) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
  warn: (...args) => {
    // Los warnings sí se mantienen en producción, pero pueden formatearse o enviarse a un servicio
    console.warn(...args);
  },
  error: (...args) => {
    // Los errores sí se mantienen en producción, críticos para debugging en caliente
    console.error(...args);
  }
};

export default logger;
