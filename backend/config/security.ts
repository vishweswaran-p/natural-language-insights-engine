// Minimal security config. CSRF is disabled for now (there is no browser
// session/auth yet). CORS will be configured under `security.cors` in a later
// phase, when the frontend starts calling the API.

export = {
  csrf: false,
};
