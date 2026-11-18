import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export const JWT_SECRET = process.env.JWT_SECRET || 'shinobi-chronicles-dev-jwt-secret-2026';

export interface AuthUserPayload {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  authSource: 'firebase' | 'jwt';
}

export interface AuthRequest extends Request {
  authUser?: AuthUserPayload;
}

export function signJwtToken(payload: Omit<AuthUserPayload, 'authSource'>): string {
  return jwt.sign({ ...payload, authSource: 'jwt' }, JWT_SECRET, { expiresIn: '7d' });
}

export async function upsertUserRecord(uid: string, email: string, displayName: string, role = 'player') {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db
        .update(users)
        .set({ email, displayName: displayName || existing[0].displayName })
        .where(eq(users.uid, uid))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Shinobi',
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();
    return inserted;
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Try local signed JWT first (fast synchronous verify)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    if (decoded && decoded.uid) {
      req.authUser = { ...decoded, authSource: 'jwt' };
      return next();
    }
  } catch {
    // Fall through to Firebase ID token verification
  }

  // 2. Verify Firebase ID Token (Google Social Sign-In)
  try {
    const firebaseDecoded = await adminAuth.verifyIdToken(token);
    const dbUser = await upsertUserRecord(
      firebaseDecoded.uid,
      firebaseDecoded.email || `${firebaseDecoded.uid}@shinobi.local`,
      firebaseDecoded.name || firebaseDecoded.email?.split('@')[0] || 'Shinobi'
    );
    req.authUser = {
      uid: firebaseDecoded.uid,
      email: dbUser.email,
      displayName: dbUser.displayName,
      role: dbUser.role,
      authSource: 'firebase',
    };
    return next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
