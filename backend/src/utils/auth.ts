import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret';

// Access Token: Short-lived (e.g., 15 minutes)
export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '15m' });
};

// Refresh Token: Long-lived (e.g., 7 days)
export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

// CSRF Token: Random string for layer 3 protection against cross-site request forgery
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
