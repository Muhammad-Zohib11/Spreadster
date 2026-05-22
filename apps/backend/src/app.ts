// ============================================================
// SPREADSTER — Express Application Factory
// ============================================================
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { aiRouter } from './routes/ai.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { operationsRouter } from './routes/operations.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { globalRateLimiter } from './middleware/rateLimit.middleware.js';
import { logger } from './lib/logger.js';

export function createApp(): Application {
  const app = express();

  // ---- Security Headers ----
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ---- CORS ----
  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, same-origin GAS)
        if (!origin) return cb(null, true);
        // Allow all *.google.com and *.googleusercontent.com origins for GAS
        if (
          origin.endsWith('.google.com') ||
          origin.endsWith('.googleusercontent.com') ||
          allowedOrigins.includes(origin)
        ) {
          return cb(null, true);
        }
        logger.warn({ origin }, 'CORS blocked origin');
        cb(new Error(`CORS policy: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    }),
  );

  // ---- Body Parsing ----
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(compression());

  // ---- Request Logging ----
  app.use(requestLogger);

  // ---- Global Rate Limiting ----
  app.use(globalRateLimiter);

  // ---- Health Check ----
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'SPREADSTER API',
      version: process.env['npm_package_version'] ?? '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env['NODE_ENV'] ?? 'development',
    });
  });

  // ---- API Routes ----
  app.use('/api/auth', authRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/audit', auditRouter);

  // ---- 404 Handler ----
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.path} not found`,
    });
  });

  // ---- Global Error Handler ----
  app.use(errorHandler);

  return app;
}
