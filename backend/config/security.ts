// CSRF is disabled (no session auth). The UI is same-origin in production and
// proxied in dev, so CORS is not configured.

export = {
  csrf: false,
};
