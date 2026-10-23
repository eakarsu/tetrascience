const fs = require('node:fs');
const path = require('node:path');

test('server exposes a health endpoint', () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
  expect(body.includes('/api/health')).toBe(true);
});

test('no hard-coded secret fallback in server entry', () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
  expect(/process\.env\.(JWT_SECRET|SESSION_SECRET)\s*\|\|\s*['"][^'"]+['"]/.test(body)).toBe(false);
});
