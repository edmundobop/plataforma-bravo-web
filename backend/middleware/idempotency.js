const DEFAULT_TTL_MS = 60 * 1000;

const store = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, exp] of store.entries()) {
    if (exp <= now) store.delete(key);
  }
}

setInterval(cleanup, 30 * 1000).unref?.();

module.exports = function idempotency(ttlMs = DEFAULT_TTL_MS) {
  return (req, res, next) => {
    const key = req.headers['x-idempotency-key'];
    if (!key) return next();
    const routeKey = `${req.method}:${req.originalUrl}:${key}`;
    if (store.has(routeKey)) {
      return res.status(202).json({ message: 'Duplicate suppressed' });
    }
    store.set(routeKey, Date.now() + ttlMs);
    next();
  };
};

