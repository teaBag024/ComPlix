// Vite config used only by the Playwright web server.
// Test servers get their own dependency cache: sharing node_modules/.vite with a running
// `npm run dev` server lets a test run re-bundle React underneath it, which loads two copies
// of React in the developer's browser ("Invalid hook call").
export default {
  cacheDir: process.env.COMPLIX_VITE_CACHE_DIR ?? 'node_modules/.vite-test',
};
