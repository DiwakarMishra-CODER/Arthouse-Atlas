import rateLimit from 'express-rate-limit';

// Throttles auth endpoints (login/register/Google login) to blunt brute-force
// and credential-stuffing attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later' }
});
