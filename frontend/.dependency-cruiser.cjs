/**
 * dependency-cruiser config (FE) — sinh sơ đồ phụ thuộc module + phát hiện import vòng.
 * Dùng qua npm scripts: `npm run dep:mermaid` (sơ đồ) · `npm run dep:check` (cảnh báo cycle).
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Cảnh báo import vòng (circular dependency) — khó bảo trì.',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Bỏ test/cypress/e2e/dist khỏi đồ thị
    exclude: { path: '(\\.(test|spec)\\.|/cypress/|/e2e/|/dist/)' },
    tsPreCompilationDeps: true,
  },
};
