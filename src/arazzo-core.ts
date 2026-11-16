/**
 * Single entry point to @connethics/arazzo-core, vendored in
 * `vendor/@connethics/arazzo-core` (copy checked by `npm run vendor:check`,
 * updated by `npm run vendor:sync`).
 *
 * The CommonJS build is imported by relative path on purpose:
 * - webpack bundles it into dist/extension.js (nothing to ship in the VSIX);
 * - the tsc-compiled tests in out/ resolve the same path at runtime
 *   (out/ and src/ are siblings of vendor/);
 * - no npm `file:` link, which would install the devDependencies of core.
 * Its only runtime dependency, `yaml`, resolves to this extension's copy, so
 * there is a single `yaml` instance.
 */
export * from '../vendor/@connethics/arazzo-core/dist/index.cjs';
