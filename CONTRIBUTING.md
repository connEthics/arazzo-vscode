# Contributing to Arazzo for VS Code

Thank you for your interest in **Arazzo for VS Code — by ConnEthics**! Contributions from the community are welcome.

## Where the code lives

| Part | Repository |
|---|---|
| Extension: VS Code providers, panels, webview UI | this repository ([connEthics/arazzo-vscode](https://github.com/connEthics/arazzo-vscode)) |
| Validation rules, types, graph model (`@connethics/arazzo-core`) | [connEthics/arazzo-demo](https://github.com/connEthics/arazzo-demo), `packages/arazzo-core` |
| Graph component (`@connethics/arazzo-flow`) | [connEthics/arazzo-demo](https://github.com/connEthics/arazzo-demo), `packages/arazzo-flow` |

The two shared packages are **vendored** into `vendor/@connethics/`. Don't edit them here. Change them in arazzo-demo, then run `npm run vendor:sync` (with `../arazzo-demo` checked out and built). `npm run vendor:check` verifies the copy.

## Development setup

```bash
npm install
(cd webview-ui && npm install && npm run build)
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host. Rebuild the webview (`cd webview-ui && npm run build`) after any UI change.

## Before opening a pull request

```bash
npm run lint
npm test                      # on a headless Linux machine: xvfb-run -a npm test
(cd webview-ui && npm test)   # vitest
npm run vendor:check
```

Add or update tests with your change. Mocha integration tests live in `src/test/` and webview tests in `webview-ui/src/test/`.

## How to contribute

1. Fork the repository and create a branch for your feature or fix.
2. Make your change and run the checks above.
3. Commit with a clear message, then open a pull request against `main`.

## Packaging for the Marketplace (maintainers)

1. Update `version` in `package.json` and the `CHANGELOG.md` entry.
2. Make sure the README screenshots (`images/v2/*.png`) are on the default branch. `vsce` rewrites the relative image links of the README to `https://github.com/connEthics/arazzo-vscode/raw/HEAD/…`. To package from another branch, add `--githubBranch <branch>`.
3. Package. This runs `vscode:prepublish`, which installs and builds the webview, then runs the production webpack build:
   ```bash
   npx @vscode/vsce package
   npx @vscode/vsce ls      # check the content of the VSIX
   ```
   The VSIX must contain `dist/`, `webview-ui/build/`, `snippets/`, `images/icon.png`, the `LICENSE` and `THIRD-PARTY-NOTICES.md` files and the vendored license files, and **no** sources, `specs/` or `node_modules`.
4. Publish with `npx @vscode/vsce publish`. This needs a Marketplace token for the `connethics` publisher.

## Reporting issues

Please open an issue on [GitHub](https://github.com/connEthics/arazzo-vscode/issues) and include the details listed in [SUPPORT.md](SUPPORT.md).

## Code of conduct

Be respectful and constructive. By participating in this project you agree to keep the discussion welcoming for everyone.
