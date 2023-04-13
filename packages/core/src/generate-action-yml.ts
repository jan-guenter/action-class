#!/usr/bin/env node
import * as fs from 'fs/promises';
import * as path from 'path';
import yargs from 'yargs';
import * as yaml from 'js-yaml';
import type { ActionYml } from '@action-class/action-yml';
import process from 'process';
import { findUp } from 'find-up';

process.env['ACTION_YAML_GENERATOR'] = 'true';

const argSpec = yargs(process.argv.slice(2))
  .scriptName('generate-action-yml')
  //.describe('Generates an action.yml form a GitHub action class')
  .usage('Usage: $0 [--package-json <path-to-package-json>] [--action-js <path-to-action-js>] <action-class>')
  .option('package-json', {
    alias: 'p',
    type: 'string',
    description: 'Path to package.json',
    nargs: 1,
    requiresArg: true,
  })
  .option('action-js', {
    alias: 'a',
    type: 'string',
    description: 'Path to action JavaScript file relative to package.json',
    nargs: 1,
    requiresArg: true,
  })
  .help()
  .version()
  .alias('h', 'help');

async function main(args: Awaited<ReturnType<typeof argSpec.parseAsync>>): Promise<void> {
  const packageJsonPath = args.packageJson
    ? path.resolve(process.cwd(), args.packageJson)
    : await findUp('package.json', { cwd: process.cwd() });

  if (!packageJsonPath) {
    throw new Error('Could not find package.json');
  }

  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);

  const actionJsPath = args.actionJs
    ? path.resolve(path.dirname(packageJsonPath), args.actionJs)
    : packageJson.main
    ? path.resolve(path.dirname(packageJsonPath), packageJson.main)
    : undefined;

  if (!actionJsPath) {
    throw new Error('Could not find the main JavaScript file');
  }

  const actionClass = args._[0];
  if (!actionClass) {
    throw new Error('Action class name must be specified');
  }

  const actionModule = await import(actionJsPath);
  const ActionClass = actionModule[actionClass];

  if (!ActionClass) {
    throw new Error(`Action class '${args.actionClass}' not found in '${actionJsPath}'`);
  }

  if (!ActionClass.actionInfo) {
    throw new Error(`Action class '${args.actionClass}' is missing the 'actionInfo' property`);
  }

  const name = ActionClass.actionInfo.name ?? packageJson.name;
  if (!name) {
    throw new Error(`Property 'name' must be set; either in the action class or in the package.json`);
  }

  const description = ActionClass.actionInfo.description ?? packageJson.description;
  if (!description) {
    throw new Error(`Property 'description' must be set; either in the action class or in the package.json`);
  }

  let author = ActionClass.actionInfo.author;
  if (!author && packageJson.author) {
    if (typeof packageJson.author === 'string') {
      author = packageJson.author;
    } else if (typeof packageJson.author === 'object') {
      author = packageJson.author.name;
      if (packageJson.author.email) {
        author += ` <${packageJson.author.email}>`;
      }
    }
  }

  const outputDir = path.dirname(packageJsonPath);

  const relativeActionJsPath = path.relative(outputDir, actionJsPath);

  const actionYml: ActionYml = {
    name,
    description,
    author,
    inputs: ActionClass.actionInfo.inputs,
    outputs: ActionClass.actionInfo.outputs,
    runs: {
      using: 'node16',
      main: relativeActionJsPath,
      ...(typeof ActionClass.prototype.pre === 'function' && {
        pre: relativeActionJsPath,
      }),
      ...(typeof ActionClass.prototype.post === 'function' && {
        post: relativeActionJsPath,
      }),
    },
    branding: ActionClass.actionInfo.branding,
  };

  const outputPath = path.resolve(outputDir, 'action.yml');
  const outputYaml = yaml.dump(actionYml);

  await fs.writeFile(outputPath, outputYaml, 'utf-8');

  console.log(`action.yml written to '${outputPath}'`);
}

(async () => {
  const args = await argSpec.parseAsync();
  try {
    await main(args);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
