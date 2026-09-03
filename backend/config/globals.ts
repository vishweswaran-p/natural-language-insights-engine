// Disable Sails' magic globals. The codebase uses explicit ES module imports so
// that `src/` stays framework-agnostic and analyzable by TypeScript.

export = {
  sails: true,
  _: false,
  async: false,
  models: false,
};
