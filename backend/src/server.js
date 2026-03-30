const { initDb } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const db = await initDb();
  const app = createApp(db);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`SIEC backend corriendo en http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('No se pudo iniciar backend:', error);
  process.exit(1);
});
