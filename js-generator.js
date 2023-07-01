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
          `Command "${command}" failed with exit code ${code}`
        );
        console.error(error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
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
      {}
    );

  packageJson.scripts = sortedScripts;

  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2)
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
      { cwd: projectPath }
    );
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
async function installTypescript(projectPath) {
  await runCommand(
    "npm install typescript @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin",
    { cwd: projectPath }
  );
  // Create tsconfig.json
  const tsconfig = await fs.promises.readFile(TSCONFIG, ENCODING);
  await fs.promises.writeFile(
    path.join(projectPath, "tsconfig.json"),
    tsconfig
  );
  // Make src directory
  await fs.promises.mkdir(path.join(projectPath, "src"));

  const scripts = {
    build: "tsc",
    dev: "tsc -w",
    typecheck: "tsc -b",
  };
  await addScriptsToPackageJson(projectPath, scripts);
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
    eslintConfig
  );
}

// This function creates a Prettier configuration file in the provided project path
async function createPrettierConfig(projectPath) {
  const prettierConfig = await fs.promises.readFile(PRETTIER_CONFIG, ENCODING);
  await fs.promises.writeFile(
    path.join(projectPath, ".prettierrc.json"),
    prettierConfig
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
      gitIgnore
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

// This function creates a new project with the given name, type, and Git setup option
// It creates a new directory, sets up an npm project, and configures ESLint and Prettier
// If the project is TypeScript, it also installs TypeScript and creates a tsconfig.json file
// Finally, it sets up Git if the useGit option is true
async function createProject(projectName, type, useGit) {
  try {
    // Create new directory
    const projectPath = path.resolve(process.cwd(), projectName);
    await fs.promises.mkdir(projectPath);

    await createNpmProject(projectPath);

    // If TypeScript, install additional dependencies and create tsconfig.json
    if (type === "TypeScript") {
      await installTypescript(projectPath);
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
      name: "useGit",
      message: "Would you like to set up Git?",
      default: true,
    },
  ];

  const answers = await inquirer.prompt(questions);

  await createProject(answers.projectName, answers.type, answers.useGit);
}

// Call the function to ask questions and start the project creation process
askQuestions();
