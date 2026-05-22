// ============================================================
// SPREADSTER — Backend Entry Point
// ============================================================
import 'dotenv/config';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

async function main() {
  // Verify DB connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error({ err }, '❌ Database connection failed');
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 SPREADSTER API running on http://localhost:${PORT}`);
    logger.info(`   Environment : ${process.env['NODE_ENV'] ?? 'development'}`);
    logger.info(`   Ollama URL  : ${process.env['OLLAMA_BASE_URL'] || 'disabled'}`);
    logger.info(`   Primary AI  : ${process.env['GEMINI_API_KEY'] ? 'gemini' : process.env['GROQ_API_KEY'] ? 'groq' : 'NOT SET'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server and DB connections closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Unhandled startup error');
  process.exit(1);
});
