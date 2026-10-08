import { join } from 'node:path';
import { buildApp } from './app';
import { loadConfig } from './config';
import { runMigrations } from './db/migrate';

const config = loadConfig();

// Keeps `docker compose up` to a single command. With several instances, migrations would rather
// run as a dedicated deployment step, so that instances do not race to apply them.
// The folder sits next to src/ and dist/: this path works both with tsx and from the bundle.
await runMigrations(config.DATABASE_URL, join(import.meta.dirname, '../drizzle'));

const app = await buildApp(config);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    process.exit(0);
  });
}

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
