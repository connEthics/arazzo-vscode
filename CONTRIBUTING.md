# Contributing to Arazzo VSCode

Thank you for your interest in contributing to Arazzo VSCode! We welcome contributions from the community to help improve this project.

## How to Contribute

1.  **Fork the repository**: Create a fork of the repository on GitHub.
2.  **Clone the repository**: Clone your fork to your local machine.
3.  **Create a branch**: Create a new branch for your feature or bug fix.
4.  **Make changes**: Implement your changes and ensure they are working correctly.
5.  **Run tests**: Run `npm test` to ensure all tests pass.
6.  **Commit changes**: Commit your changes with clear and concise commit messages.
7.  **Push changes**: Push your branch to your fork on GitHub.
8.  **Submit a Pull Request**: Open a Pull Request against the main repository.

## Packaging for Marketplace

To create a VSIX package for the VS Code Marketplace:

1.  **Update Version**: Update the version number in `package.json`.
2.  **Build Webview**: Ensure the webview is built.
    ```bash
    cd webview-ui
    npm install
    npm run build
    cd ..
    ```
3.  **Package Extension**: Run the packaging command.
    ```bash
    npx @vscode/vsce package
    ```
    This will generate a `.vsix` file in the root directory.

## Reporting Issues

If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository. Provide as much detail as possible, including steps to reproduce the issue.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
