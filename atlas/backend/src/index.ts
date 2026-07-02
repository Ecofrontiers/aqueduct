import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { createRoutes } from './routes/index.js';
import { WebSocketManager } from './services/websocket.js';
import { KeeperService } from './services/keeper.js';

async function main() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json());

  // Health check
  app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // API routes
  app.use('/api', createRoutes());

  // Create HTTP server
  const server = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });
  const wsManager = new WebSocketManager(wss);
  wsManager.start();

  // Start keeper service (automated operations)
  const keeper = new KeeperService();
  if (config.keeperEnabled) {
    keeper.start();
    logger.info('Keeper service started');
  }

  // Start server
  server.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`WebSocket available at ws://localhost:${config.port}/ws`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    keeper.stop();
    wsManager.stop();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
