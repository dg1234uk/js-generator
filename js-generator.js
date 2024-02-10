#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { spawn } from "child_process";
import inquirer from "inquirer";
import { fileURLToPath } from "url";

const ENCODING = "utf8";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const TSCONFIG = path.join(dirname, "project_config/tsconfig.json");
const ESLINT_CONFIG_JS = path.join(dirname, "project_config/.eslintrc_js.json");
const ESLINT_CONFIG_TS = path.join(dirname, "project_config/.eslintrc_ts.json");
const PRETTIER_CONFIG = path.join(dirname, "project_config/.prettierrc.json");
const GITIGNORE = path.join(dirname, "project_config/.gitignore");

// This function prints the given command to the console using magenta color
function printCommand(command) {
  console.log(chalk.magenta(command));
}

// This function prints the given output to the console using yellow color
function printOutput(output) {
  console.log(chalk.yellow(output));
}

// This function runs a given command with the provided options
// It returns a promise that resolves when the command has successfully executed
// and rejects when the command fails or an error occurs
function runCommand(command, options) {
  printCommand(command);
  return new Promise((resolve, reject) => {
    const args = command.match(/[^"\s]+|"[^"]+"/g);
    const cmd = args.shift();

    const childProcess = spawn(cmd, args, { stdio: "inherit", ...options });

    childProcess.on("error", (error) => {
      console.error(`Error while executing command: ${command}`);
      console.error(error);
      reject(error);
    });

    childProcess.on("exit", (code) => {
      if (code !== 0) {
        const error = new Error(
          `Command "${command}" failed with exit code ${code}`,
        );
        console.error(error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// This function sets package.json type to module
async function modulePackageJson(projectPath) {
  const packageJsonPath = path.join(projectPath, "package.json");

  // Ensure the package.json file exists
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`File not found: ${packageJsonPath}`);
  }

  const packJsonFile = await fs.promises.readFile(packageJsonPath, ENCODING);
  const packageJson = JSON.parse(packJsonFile);

  packageJson.type = "module";

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
  );
}

// This function adds new scripts to the package.json file in the provided project path
// If the package.json file does not exist, it throws an error
async function addScriptsToPackageJson(projectPath, scripts) {
  const packageJsonPath = path.join(projectPath, "package.json");

  // Ensure the package.json file exists
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`File not found: ${packageJsonPath}`);
  }

  const packJsonFile = await fs.promises.readFile(packageJsonPath, ENCODING);
  const packageJson = JSON.parse(packJsonFile);

  packageJson.scripts = {
    ...packageJson.scripts,
    ...scripts,
  };

  // Sort the keys in alphabetical order
  const sortedScripts = Object.keys(packageJson.scripts)
    .sort()
    .reduce(
      (obj, key) => ({
        ...obj,
        [key]: packageJson.scripts[key],
      }),
      {},
    );

  packageJson.scripts = sortedScripts;

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2),
  );
}

// This function creates a new npm project at the provided project path
// It initializes the project, installs necessary dev dependencies, and adds scripts to package.json
// If an error occurs during this process, it logs the error and exits the process
async function createNpmProject(projectPath) {
  try {
    await runCommand("npm init -y", { cwd: projectPath });
    await runCommand(
      "npm install --save-dev eslint prettier eslint-config-prettier eslint-config-airbnb eslint-plugin-import",
      { cwd: projectPath },
    );
    await modulePackageJson(projectPath);
    const scripts = {
      format: "prettier --write .",
      lint: "eslint .",
    };
    await addScriptsToPackageJson(projectPath, scripts);
  } catch (error) {
    console.error(`Error while creating npm project: ${error.message}`);
    process.exit(1);
  }
}

// This function installs TypeScript and necessary dev dependencies in the provided project path
// It also creates a tsconfig.json file and a src directory
// Finally, it adds some scripts to the package.json file
async function setupTypescript(projectPath, singleDevScript) {
  await runCommand(
    "npm install --save-dev typescript @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin",
    { cwd: projectPath },
  );
  // Create tsconfig.json
  const tsconfig = await fs.promises.readFile(TSCONFIG, ENCODING);
  await fs.promises.writeFile(
    path.join(projectPath, "tsconfig.json"),
    tsconfig,
  );
  // Make src directory
  await fs.promises.mkdir(path.join(projectPath, "src"), { recursive: true });

  if (singleDevScript) {
    const scripts = {
      build: "tsc",
      dev: "tsc -w",
      typecheck: "tsc -b",
    };
    await addScriptsToPackageJson(projectPath, scripts);
  } else {
    await addScriptsToPackageJson(projectPath, { "dev:typescript": "tsc -w" });
  }

  await fs.promises.writeFile(
    path.join(projectPath, "src", "app.ts"),
    'console.log("Hello, world!");',
  );
}

// This function installs tailwindcss and initializes it in the provided project path
async function setupTailwindcss(projectPath, type, singleDevScript) {
  await runCommand("npm install --save-dev tailwindcss", { cwd: projectPath });
  const configType = type === "TypeScript" ? "--ts" : "--esm";
  await runCommand(`npx tailwindcss init ${configType}`, { cwd: projectPath });
  await fs.promises.mkdir(path.join(projectPath, "src/styles"), {
    recursive: true,
  });

  // Read in the tailwind.config file
  const tailwindConfigFileName =
    type === "TypeScript" ? "tailwind.config.ts" : "tailwind.config.js";
  const tailwindConfigPath = path.join(projectPath, tailwindConfigFileName);

  // Read in the tailwind.config file
  let tailwindConfigFile = await fs.promises.readFile(
    tailwindConfigPath,
    ENCODING,
  );

  // Modify the configuration
  tailwindConfigFile = tailwindConfigFile.replace(
    /content: \[\],/,
    `content: ["./src/**/*.{html,js}", "./index.html"],`,
  );

  // Write the updated configuration back to the file
  await fs.promises.writeFile(tailwindConfigPath, tailwindConfigFile);

  // Create a basic CSS file
  const cssContent = `@import 'tailwindcss/base';
  @import 'tailwindcss/components';
  @import 'tailwindcss/utilities';
  `;
  await fs.promises.writeFile(
    path.join(projectPath, "src/styles/", "styles.css"),
    cssContent,
  );

  // Add the CSS to your HTML
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectPath}</title>
    <link href="./build/output.css" rel="stylesheet">
  </head>
  <body class="bg-gray-200 text-gray-900">
    <!-- Your content here -->
  </body>
  </html>
  `;
  await fs.promises.writeFile(
    path.join(projectPath, "index.html"),
    htmlContent,
  );

  if (singleDevScript) {
    addScriptsToPackageJson(projectPath, {
      css: "tailwindcss -i ./src/styles.css -o ./build/output.css --watch",
    });
  } else {
    await addScriptsToPackageJson(projectPath, {
      "dev:tailwind":
        "tailwindcss -i ./src/styles/tailwind.css -o ./build/output.css --watch",
    });
  }

  // Install the prettier plugin for tailwindcss for automatic class ordering
  await runCommand("npm install --save-dev prettier-plugin-tailwindcss", {
    cwd: projectPath,
  });
}

// This function creates an ESLint configuration file in the provided project path
// The configuration file created depends on whether the project is JavaScript or TypeScript
async function createEslintConfig(projectPath, type) {
  let eslintConfig;
  if (type === "JavaScript") {
    await runCommand("npm install --save-dev eslint-config-airbnb", {
      cwd: projectPath,
    });
    eslintConfig = await fs.promises.readFile(ESLINT_CONFIG_JS, ENCODING);
  } else if (type === "TypeScript") {
    eslintConfig = await fs.promises.readFile(ESLINT_CONFIG_TS, ENCODING);
  } else {
    throw new Error("Invalid project type");
  }

  await fs.promises.writeFile(
    path.join(projectPath, ".eslintrc.json"),
    eslintConfig,
  );
}

// This function creates a Prettier configuration file in the provided project path
async function createPrettierConfig(projectPath) {
  const prettierConfig = await fs.promises.readFile(PRETTIER_CONFIG, ENCODING);
  await fs.promises.writeFile(
    path.join(projectPath, ".prettierrc.json"),
    prettierConfig,
  );
}

// This function sets up Git in the provided project path
// It initializes Git, commits the project setup, and creates a 'dev' branch
// It also writes a .gitignore file
// Finally, it outputs a success message
async function setupGit(projectPath, useGit, projectName) {
  if (useGit) {
    const gitIgnore = await fs.promises.readFile(GITIGNORE, ENCODING);
    // Write .gitignore
    await fs.promises.writeFile(
      path.join(projectPath, ".gitignore"),
      gitIgnore,
    );

    // Initialize Git, commit project setup, and create 'dev' branch
    await runCommand("git init", { cwd: projectPath });
    await runCommand("git add .", { cwd: projectPath });
    await runCommand('git commit -m "Initial commit: project setup"', {
      cwd: projectPath,
    });
    await runCommand("git checkout -b dev", { cwd: projectPath });

    printOutput(`Git has been set up, and you are now on the 'dev' branch.`);
  }
  printOutput(`Project ${projectName} has been created`);
}

// This function creates a new project with the given name, type, tailwindcss, and Git setup option
// It creates a new directory, sets up an npm project, and configures ESLint and Prettier
// If the project is TypeScript, it also installs TypeScript and creates a tsconfig.json file
// If the project uses Tailwindcss, it installs tailwindcss and configures it
// Finally, it sets up Git if the useGit option is true
async function createProject(projectName, type, useTailwindcss, useGit) {
  try {
    // Create new directory
    const projectPath = path.resolve(process.cwd(), projectName);
    await fs.promises.mkdir(projectPath);

    await createNpmProject(projectPath);

    // If TypeScript and Tailwindcss, install npm-run-all and add dev script
    let singleDevScript = true;
    if (type === "TypeScript" && useTailwindcss) {
      singleDevScript = false;
      await runCommand("npm install --save-dev npm-run-all", {
        cwd: projectPath,
      });
      await addScriptsToPackageJson(projectPath, { dev: "run-p dev:*" });
    }

    // If TypeScript, install additional dependencies and create tsconfig.json
    if (type === "TypeScript") {
      await setupTypescript(projectPath, singleDevScript);
    }

    // If Tailwindcss, install additional dependencies and create tailwind.config.js
    if (useTailwindcss) {
      await setupTailwindcss(projectPath, type, singleDevScript);
    }

    await createEslintConfig(projectPath, type);
    await createPrettierConfig(projectPath);

    await setupGit(projectPath, useGit, projectName);
  } catch (error) {
    console.error(chalk.red(`Error creating project: ${error.message}`));
    process.exit(1);
  }
}

// This function asks the user a series of questions about the new project to create
// It prompts for the project name, the type (JavaScript or TypeScript), and whether to use Git
// The function then creates the project with the provided details
async function askQuestions() {
  const questions = [
    {
      type: "input",
      name: "projectName",
      message: "Please provide a project name:",
      default: "my_project",
    },
    {
      type: "list",
      name: "type",
      message: "Would you like to set up a JavaScript or TypeScript project?",
      choices: ["JavaScript", "TypeScript"],
      default: "JavaScript",
    },
    {
      type: "confirm",
      name: "useTailwindcss",
      message: "Would you like to set up Tailwind CSS?",
      default: false,
    },
    {
      type: "confirm",
      name: "useGit",
      message: "Would you like to set up Git?",
      default: true,
    },
  ];

  const answers = await inquirer.prompt(questions);

  await createProject(
    answers.projectName,
    answers.type,
    answers.useTailwindcss,
    answers.useGit,
  );
}

// Call the function to ask questions and start the project creation process
askQuestions();
