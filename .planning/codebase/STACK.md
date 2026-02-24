# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.9.3 (strict mode) - Extension logic and webview React components
- TypeScript 5.2.2 (strict mode) - Webview UI development with JSX support

**Secondary:**
- JavaScript - Webpack configuration and build scripts

## Runtime

**Environment:**
- Node.js (via npm scripts and webpack)
- VS Code Extension Host (Node.js runtime)
- Webview Browser Context (ES2020 target in browser)

**Package Manager:**
- npm - Lock file: `package-lock.json` present

## Frameworks

**Core:**
- VS Code Extension API 1.90.0 - Main extension framework
- React 18.2.0 - Webview UI framework
- Vite 5.2.0 - Webview build tool and dev server

**Build/Dev:**
- webpack 5.103.0 - Extension bundler (targets Node.js CommonJS)
- ts-loader 9.5.4 - TypeScript loader for webpack
- Vite React Plugin 4.2.1 - React support in Vite

**Testing:**
- @vscode/test-electron 2.5.2 - VS Code integration test runner
- @vscode/test-cli 0.0.12 - CLI for running tests
- Mocha 10.0.10 (@types/mocha) - Test framework

**Linting/Formatting:**
- ESLint 9.39.1 - Code linting
- typescript-eslint 8.48.1 - TypeScript ESLint support

## Key Dependencies

**Critical:**
- yaml 2.8.2 (extension) / 2.4.1 (webview) - YAML parsing and serialization for Arazzo specs
- mermaid 10.9.0 - Flowchart diagram rendering in webview
- react-markdown 9.0.1 - Markdown rendering in documentation view
- remark-gfm 4.0.0 - GitHub Flavored Markdown support for react-markdown

**UI/Styling:**
- tailwindcss 3.4.3 - Utility-first CSS framework
- postcss 8.4.38 - CSS processing
- autoprefixer 10.4.19 - CSS vendor prefixes
- lucide-react 0.378.0 - Icon library
- react-dom 18.2.0 - React DOM rendering
- clsx 2.1.0 - Utility for conditional class names
- tailwind-merge 2.2.1 - Tailwind class merging utility

**Type Definitions:**
- @types/node 22.x - Node.js type definitions
- @types/vscode 1.90.0 - VS Code API type definitions
- @types/react 18.2.66 - React type definitions
- @types/react-dom 18.2.22 - React DOM type definitions

## Configuration

**Environment:**
- No .env configuration required (extension loads from VS Code settings API)
- Extension activates on `onLanguage:yaml` - triggers when YAML files are opened

**Build:**
- `webpack.config.js` - Extension bundler (targets Node16 ES2022)
- `webview-ui/vite.config.ts` - Webview UI bundler with React plugin
- `webview-ui/tailwind.config.js` - Tailwind CSS configuration with VS Code dark mode support
- `webview-ui/postcss.config.js` - PostCSS configuration
- `tsconfig.json` - Extension compiler (ES2022 target, Node16 module)
- `webview-ui/tsconfig.json` - Webview compiler (ES2020 target, JSX support)
- `eslint.config.mjs` - ESLint configuration (typescript-eslint with naming conventions)

## Platform Requirements

**Development:**
- VS Code 1.90.0 or newer (engine requirement in package.json)
- Node.js (for npm and webpack)
- npm (package manager)

**Production:**
- VS Code 1.90.0 or newer (published on VS Code Marketplace)
- Deployment: VS Code Marketplace (via vsce package)

## Build Output

**Extension:**
- `dist/extension.js` - Bundled extension code (CommonJS, webpack)
- Source maps: `dist/extension.js.map` (hidden in production builds)

**Webview UI:**
- `webview-ui/build/` - Static assets (HTML, CSS, JS bundles from Vite)
- Asset naming: `assets/[name].js`, `assets/[name].[ext]`
- Must be built before extension can render preview/flowchart panels

---

*Stack analysis: 2026-02-24*
