// What the API lets in. Kept as plain functions so the tests can check them
// without starting a server.

// The sites allowed to call the API from a browser. CORS_ORIGINS (comma-
// separated) replaces the list, e.g. to add a preview deployment. A page on
// this machine (any localhost port: the dev server, test servers, vite
// preview) is always let in; no other website can be served from there.
const DEFAULT_ORIGINS = ['https://arthouse-atlas.vercel.app'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function allowedOrigins(env = process.env) {
  const list = env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean);
  return list?.length ? list : DEFAULT_ORIGINS;
}

// A request with no Origin isn't from a browser page (UptimeRobot, curl,
// server to server), so CORS has nothing to protect there. A page on any
// other site gets no CORS header back, and the browser won't hand it the reply.
export function corsOptions(origins = allowedOrigins()) {
  const allowed = new Set(origins);
  return {
    origin(origin, done) {
      done(null, !origin || allowed.has(origin) || LOCAL.test(origin));
    },
  };
}

// MongoDB reads keys starting with `$` as operators, so a body like
// {"email": {"$ne": null}} would turn a lookup into "any user". Dotted keys
// reach into nested fields. Neither belongs in anything a visitor sends.
export function stripOperators(value) {
  if (Array.isArray(value)) {
    value.forEach(stripOperators);
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else stripOperators(value[key]);
    }
  }
  return value;
}

// In place, since Express 4 hands each request its own parsed objects.
export function sanitizeInput(req, res, next) {
  stripOperators(req.body);
  stripOperators(req.query);
  stripOperators(req.params);
  next();
}
