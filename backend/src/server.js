// ─────────────────────────────────────────────────────────────
//  HTTP server entry point. Boots the Express app, installs
//  process-level safety nets (unhandled rejections / exceptions)
//  and handles graceful shutdown.
// ─────────────────────────────────────────────────────────────
const createApp = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger').child({ scope: 'server' });
const { disconnect } = require('./db/prisma');

const app = createApp();

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`Server listening on http://${config.server.host}:${config.server.port}`, {
    env: config.env,
  });
});

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await disconnect();
    process.exit(0);
  });
  // Force-exit if shutdown stalls.
  setTimeout(() => process.exit(1), 10000).unref();
}

['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

// Last-resort safety nets so the process never dies silently.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});

module.exports = server;
