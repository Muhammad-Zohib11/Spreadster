// ============================================================
// SPREADSTER — Auth Routes
// POST /api/auth/login           → Email + password login
// POST /api/auth/logout          → Revoke session
// GET  /api/auth/me              → Get current user
// GET  /api/auth/google          → Redirect to Google OAuth
// GET  /api/auth/google/callback → Handle Google OAuth callback
// ============================================================
import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { auditService } from '../services/audit.service.js';
import { logger } from '../lib/logger.js';

export const authRouter = Router();

const JWT_SECRET = process.env['JWT_SECRET'] ?? '';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '8h';
const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? '';
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? '';
const GOOGLE_REDIRECT_URI = process.env['GOOGLE_REDIRECT_URI'] ?? '';

function generateToken(userId: string, role: string, email: string): string {
  return jwt.sign({ sub: userId, role, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  });
}

// ---- POST /api/auth/login ----

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 128 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash || !user.isActive) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        await auditService.log({ type: 'USER_LOGIN', userId: user.id, success: false, ip: req.ip });
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Create session
      const token = generateToken(user.id, user.role, user.email);
      const tokenHash = await bcrypt.hash(token.slice(-20), 8); // store partial hash

      await prisma.session.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 8 * 3_600_000),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      await auditService.log({ type: 'USER_LOGIN', userId: user.id, success: true, ip: req.ip });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Login error');
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  },
);

// ---- POST /api/auth/logout ----

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.session.deleteMany({ where: { userId: req.userId } });
    await auditService.log({ type: 'USER_LOGOUT', userId: req.userId, success: true });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Logout error');
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// ---- GET /api/auth/me ----

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, department: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, user });
});

// ---- GET /api/auth/google ----

authRouter.get('/google', (req: Request, res: Response): void => {
  const state = uuidv4(); // CSRF protection
  const scope = encodeURIComponent('openid email profile');
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=select_account`;

  res.cookie('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600_000 });
  res.redirect(url);
});

// ---- GET /api/auth/google/callback ----

authRouter.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
    return;
  }

  const savedState = req.cookies?.oauth_state;
  if (!state || state !== savedState) {
    res.status(400).json({ success: false, error: 'Invalid OAuth state — possible CSRF' });
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokens = (await tokenRes.json()) as { id_token: string; access_token: string };

    // Get user info from Google
    const userRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokens.access_token}`,
    );
    const googleUser = (await userRes.json()) as { sub: string; email: string; name: string; picture?: string };

    // Upsert user
    const user = await prisma.user.upsert({
      where: { googleId: googleUser.sub },
      create: {
        id: uuidv4(),
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture,
        role: 'TEACHER',
      },
      update: {
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
    });

    const jwtToken = generateToken(user.id, user.role, user.email);

    await auditService.log({ type: 'USER_LOGIN', userId: user.id, success: true, ip: req.ip });

    // Redirect to frontend with token
    const frontendUrl = process.env['FRONTEND_URL'] ?? process.env['ALLOWED_ORIGINS']?.split(',').find(o => o.includes('vercel.app')) ?? 'http://localhost:5173';
    res.clearCookie('oauth_state');
    res.redirect(`${frontendUrl}?token=${encodeURIComponent(jwtToken)}&name=${encodeURIComponent(user.name)}`);
  } catch (err) {
    logger.error({ err }, 'Google OAuth callback error');
    res.redirect(`/?auth_error=oauth_failed`);
  }
});

// ---- POST /api/auth/gas-login ----
// Called by Google Apps Script using the user's Google session email.
// The API key header acts as the shared secret.
authRouter.post('/gas-login', async (req: Request, res: Response): Promise<void> => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env['API_KEY'] ?? '';
  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, error: 'email required' });
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          name: email.split('@')[0].replace(/[._]/g, ' '),
          role: 'TEACHER',
          isActive: true,
        },
      });
    }
    const token = generateToken(user.id, user.role, user.email);
    await auditService.log({ type: 'USER_LOGIN', userId: user.id, success: true, ip: req.ip });
    res.json({ success: true, token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    logger.error({ err }, 'GAS auto-login error');
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});
