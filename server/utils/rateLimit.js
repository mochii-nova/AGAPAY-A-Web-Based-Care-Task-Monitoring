// A small "max N requests per window per IP" limit, kept in memory.
// Good enough for one server; it resets when the server restarts.
function rateLimit({ max, windowMs, message }) {
  const hits = new Map(); // ip -> [timestamps]

  // Forget old entries every 10 minutes so the map doesn't grow forever
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, times] of hits) {
      const recent = times.filter((t) => t > cutoff);
      if (recent.length) hits.set(ip, recent);
      else hits.delete(ip);
    }
  }, 10 * 60 * 1000).unref();

  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil((recent[0] + windowMs - now) / 1000)));
      return res.status(429).json({ message });
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}

module.exports = rateLimit;
