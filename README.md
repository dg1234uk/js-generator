# JavaScript Project Generator

This is a command-line tool to bootstrap a new JavaScript or TypeScript project. It sets up an NPM project with ESLint, Prettier, and now with the optional integration of Tailwind CSS. For TypeScript projects, it also installs TypeScript along with the required dev dependencies. Optionally, it can also initialize a Git repository and create a `.gitignore` file.

## Installation

To install this tool globally, navigate to the directory containing the `package.json` and run:

```bash
npm install -g .
```

After this, you should be able to run the `create-project` command from anywhere on your system.

## Usage

To create a new project, simply run:

```bash
create-project
```

This will prompt you for the following information:

- Project name (default: `my_project`)
- Project type (`JavaScript` or `TypeScript`; default: `JavaScript`)
- Whether to initialize a Git repository (default: `true`)
- Whether to include Tailwind CSS in the project (default: `false`)

The tool will then create a new directory with the provided project name, set up an NPM project, and configure ESLint and Prettier. If you chose a TypeScript project, it will also install TypeScript and create a `tsconfig.json` file. If you opted to initialize a Git repository, it will do so, commit the project setup, create a `dev` branch, and write a `.gitignore` file. If you chose to include Tailwind CSS, it will be installed and configured accordingly.

## Features

- Creates a new directory for your project.
- Sets up an NPM project with pre-configured scripts for linting, formatting, and optionally for building Tailwind CSS.
- Installs ESLint, Prettier, and optionally Tailwind CSS, and creates their configuration files.
- If TypeScript is chosen, installs TypeScript and necessary dev dependencies, and creates a `tsconfig.json` file and a `src` directory.
- Optionally initializes a Git repository, commits the initial project setup, creates a `dev` branch, and writes a `.gitignore` file.
- Outputs color-coded command output and error messages for better visibility.

## Dependencies

- Node.js and npm
- The [`chalk`](https://www.npmjs.com/package/chalk) package for color-coded console output.
- The [`inquirer`](https://www.npmjs.com/package/inquirer) package for interactive command line prompts.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the project's GitHub page.
