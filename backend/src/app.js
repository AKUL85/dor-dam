// ─────────────────────────────────────────────────────────────
//  Express application factory. Wires middleware, routes and the
//  central error handler. Exported separately from the server so
//  it can be imported in tests without binding a port.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(',').map((o) => o.trim()),
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
