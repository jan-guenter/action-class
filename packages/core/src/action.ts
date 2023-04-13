/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNativeError } from 'util/types';
import type { InputOptions } from '@actions/core';
import * as core from '@actions/core';
import type { ActionYml, ActionYmlBranding, ActionYmlInputData, ActionYmlOutputData } from '@action-class/action-yml';
import * as process from 'process';

interface ActionInputDescriptorBase<T> {
  description: string;
  required?: true;
  defaultValue?: NonNullable<T>;
  trimWhitespace?: false;
  validate?: (value?: T) => boolean | string;
  deprecationMessage?: string;
}

interface ActionInputDescriptorString extends ActionInputDescriptorBase<string> {
  type: 'string';
}
interface ActionInputDescriptorMultiLine extends ActionInputDescriptorBase<string[]> {
  type: 'string[]';
}
interface ActionInputDescriptorBoolean extends ActionInputDescriptorBase<boolean> {
  type: 'boolean';
}
interface ActionInputDescriptorNumber extends ActionInputDescriptorBase<number> {
  type: 'number';
}

type ActionInputConverter = {
  fromInput: (value: string) => any;
  toInput: (value: any) => string;
};

interface ActionInputDescriptorConverted extends ActionInputDescriptorBase<any> {
  converter: ActionInputConverter;
}

type ActionInputDescriptor =
  | ActionInputDescriptorString
  | ActionInputDescriptorMultiLine
  | ActionInputDescriptorBoolean
  | ActionInputDescriptorNumber
  | ActionInputDescriptorConverted;

type ActionInputNullableIfOptionalAndNoDefault<TInput, T> = TInput extends { required: true }
  ? T
  : TInput extends { defaultValue: any }
  ? T
  : T | undefined;

type ActionInputType<T extends ActionInputDescriptor> = ActionInputNullableIfOptionalAndNoDefault<
  T,
  T extends { type: 'string' }
    ? string
    : T extends { type: 'string[]' }
    ? string[]
    : T extends { type: 'boolean' }
    ? boolean
    : T extends { type: 'number' }
    ? number
    : T extends {
        converter: {
          toInput: (value: infer U) => string;
        };
      }
    ? U
    : never
>;

interface ActionOutputDescriptorBase<T> {
  description: string;
  initValue?: NonNullable<T>;
  converter?: (value: T) => string;
}

interface ActionOutputDescriptorString extends ActionOutputDescriptorBase<string> {
  type: 'string';
}

interface ActionOutputDescriptorBoolean extends ActionOutputDescriptorBase<boolean> {
  type: 'boolean';
}

interface ActionOutputDescriptorNumber extends ActionOutputDescriptorBase<number> {
  type: 'number';
}

type ActionOutputDescriptor =
  | ActionOutputDescriptorString
  | ActionOutputDescriptorBoolean
  | ActionOutputDescriptorNumber
  | ActionOutputDescriptorBase<any>;

type ActionOutputType<T> = T extends { type: 'string' }
  ? string
  : T extends { type: 'boolean' }
  ? boolean
  : T extends { type: 'number' }
  ? number
  : T extends { initValue: infer U }
  ? U
  : T extends { converter: (value: infer U) => string }
  ? U
  : string;

type ActionInputDescriptors = Record<string, ActionInputDescriptor>;

type ActionOutputDescriptors = Record<string, ActionOutputDescriptor>;

type ActionInputsType<T extends ActionInputDescriptors> = {
  [Key in keyof T]: ActionInputType<T[Key]>;
};

type ActionOutputsType<T extends ActionOutputDescriptors> = {
  [Key in keyof T]: ActionOutputType<T[Key]>;
};

interface ActionDescriptor {
  name?: string;
  description?: string;
  author?: string;
  inputs?: ActionInputDescriptors;
  outputs?: ActionOutputDescriptors;
  branding?: ActionYmlBranding;
}

interface ActionBase<TInputs, TOutputs> {
  get inputs(): Readonly<TInputs>;
  outputs: TOutputs;
}

export interface Action<TInputs, TOutputs> extends ActionBase<TInputs, TOutputs> {
  pre?: () => Promise<void>;
  main(): Promise<void>;
  post?: () => Promise<void>;
}

function parseInputs<T extends ActionInputDescriptors>(inputs: T): ActionInputsType<T> {
  const result = {} as ActionInputsType<T>;
  for (const inputsKey in inputs) {
    try {
      const inputDescriptor = inputs[inputsKey];
      let value: unknown;
      const options: InputOptions = {
        ...(inputDescriptor.trimWhitespace === false && { trimWhitespace: false }),
        ...(inputDescriptor.required && { required: true }),
      };
      if ('type' in inputDescriptor) {
        switch (inputDescriptor.type) {
          case 'string[]': {
            const arrayValue = core.getMultilineInput(inputsKey, options);
            value = arrayValue.length > 0 ? arrayValue : undefined;
            break;
          }
          case 'boolean':
            try {
              value = core.getBooleanInput(inputsKey, options);
            } catch (error) {
              if (error instanceof TypeError) {
                value = undefined;
              } else {
                throw error;
              }
            }
            break;
          case 'number': {
            const strValue = core.getInput(inputsKey, options);
            value = strValue ? Number(strValue) : undefined;
            break;
          }
          default: {
            const strValue = core.getInput(inputsKey, options);
            value = strValue ? strValue : undefined;
            break;
          }
        }
      } else if ('converter' in inputDescriptor) {
        const strValue = core.getInput(inputsKey, options);
        value = strValue ? inputDescriptor.converter.fromInput(strValue) : undefined;
      }

      if (typeof value !== 'boolean' && typeof value !== 'number' && value && inputDescriptor.deprecationMessage) {
        core.warning(`Input '${inputsKey}' is deprecated: ${inputDescriptor.deprecationMessage}`);
      }

      if (typeof value === 'undefined') {
        if (inputDescriptor.required) {
          throw new Error(`Input is required: ${inputsKey}`);
        }
        if (typeof inputDescriptor.defaultValue === 'undefined') {
          continue;
        }
        value = inputDescriptor.defaultValue;
      }

      if (inputDescriptor.validate) {
        const validationError = inputDescriptor.validate(value);
        if (typeof validationError === 'string') {
          throw new Error(`Input validation failed: ${validationError}`);
        } else if (!validationError) {
          throw new Error(`Input validation failed: ${inputsKey} = ${value}`);
        }
      }

      result[inputsKey] = value as ActionInputType<T[keyof T]>;
    } catch (error) {
      throw prefixError(error, `Error while reading input '${inputsKey}':`);
    }
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function action<T extends ActionDescriptor>(descriptor: T) {
  const inputs: Record<string, ActionYmlInputData> = {};
  if (descriptor.inputs) {
    for (const key in descriptor.inputs) {
      if (!(key in descriptor.inputs)) {
        throw new Error(`Missing descriptor for input '${key}'`);
      }
      const input = descriptor.inputs[key];
      inputs[key] = {
        description: input.description,
        ...(input.required && { required: input.required }),
        ...(input.defaultValue && {
          default:
            'converter' in input
              ? input.converter.toInput(input.defaultValue) ?? String(input.defaultValue)
              : String(input.defaultValue),
        }),
        ...(input.deprecationMessage && { deprecationMessage: input.deprecationMessage }),
      };
    }
  }
  const outputs: Record<string, ActionYmlOutputData> = {};
  if (descriptor.outputs) {
    for (const key in descriptor.outputs) {
      if (!(key in descriptor.outputs)) {
        throw new Error(`Missing descriptor for output '${key}'`);
      }
      outputs[key] = {
        description: descriptor.outputs[key].description,
      };
    }
  }

  // noinspection JSUnusedGlobalSymbols
  return class implements ActionBase<ActionInputsType<T['inputs'] & {}>, ActionOutputsType<T['outputs'] & {}>> {
    static readonly actionInfo: Partial<ActionYml> = {
      ...(descriptor.name && { name: descriptor.name }),
      ...(descriptor.description && { description: descriptor.description }),
      ...(descriptor.author && { author: descriptor.author }),
      ...(descriptor.inputs && { inputs }),
      ...(descriptor.outputs && { outputs }),
    };

    readonly #inputs: ActionInputsType<T['inputs'] & {}>;

    get inputs(): Readonly<ActionInputsType<T['inputs'] & {}>> {
      return this.#inputs;
    }

    outputs: ActionOutputsType<T['outputs'] & {}>;

    constructor() {
      this.#inputs = descriptor.inputs ? parseInputs(descriptor.inputs) : {};
      const outputProperties = {} as PropertyDescriptorMap & ThisType<ActionOutputsType<T['outputs'] & {}>>;
      for (const output in descriptor.outputs) {
        const outputDescriptor = descriptor.outputs[output];
        const outputSetter: (
          value: ActionOutputType<(T['outputs'] & {})[Extract<ActionOutputsType<T['outputs'] & {}>, string>]>,
        ) => void = value => {
          if (outputDescriptor.converter) {
            try {
              core.setOutput(output, outputDescriptor.converter(value));
            } catch (error) {
              throw prefixError(error, `Error while converting output '${output}':`);
            }
          } else {
            core.setOutput(output, String(value));
          }
        };
        let valueStorage: ActionOutputType<(T['outputs'] & {})[Extract<ActionOutputsType<T['outputs'] & {}>, string>]>;
        if (outputDescriptor.initValue) {
          valueStorage = outputDescriptor.initValue;
          outputSetter(outputDescriptor.initValue);
        }
        outputProperties[output] = {
          get(): ActionOutputType<(T['outputs'] & {})[Extract<ActionOutputsType<T['outputs'] & {}>, string>]> {
            return valueStorage;
          },
          set(
            value: ActionOutputType<(T['outputs'] & {})[Extract<ActionOutputsType<T['outputs'] & {}>, string>]>,
          ): void {
            valueStorage = value;
            outputSetter(value);
          },
          enumerable: true,
        };
      }
      this.outputs = Object.defineProperties({} as ActionOutputsType<T['outputs'] & {}>, outputProperties);
    }
  };
}

function prefixError(error: unknown, messagePrefix: string): Error {
  if (isNativeError(error)) {
    error.message = `${messagePrefix} ${error.message}`;
    return error;
  }
  return Error(`${messagePrefix} ${error}`);
}

export async function runAction<TInputs, TOutputs, T extends new (...args: any[]) => Action<TInputs, TOutputs>>(
  constructor: T,
  ...actionArgs: ConstructorParameters<T>
): Promise<void> {
  if (process.env['ACTION_YAML_GENERATOR'] === 'true') {
    // skip action execution when generating action.yml
    return;
  }
  try {
    const actionInstance = new constructor(...actionArgs);
    core.debug(`evaluated inputs: ${JSON.stringify(actionInstance.inputs, null, 2)}`);

    const phaseStateKey = `${constructor.name}_action_phase`;
    let actionPhase = core.getState(phaseStateKey);
    if (!actionPhase) {
      actionPhase = actionInstance.pre ? 'pre' : 'main';
    }
    core.debug(`action phase: ${actionPhase}`);
    switch (actionPhase) {
      case 'pre':
        core.saveState(phaseStateKey, 'main');
        if (!actionInstance.pre) {
          throw new Error('Action does not support pre phase');
        }
        await actionInstance.pre();
        break;
      case 'main':
        core.saveState(phaseStateKey, 'post');
        await actionInstance.main();
        core.debug(`outputs: ${JSON.stringify(actionInstance.outputs, null, 2)}`);
        break;
      case 'post':
        if (!actionInstance.post) {
          throw new Error('Action does not support pre phase');
        }
        await actionInstance.post();
        break;
      default:
        throw new Error(`Invalid action phase: ${actionPhase}`);
    }
  } catch (error) {
    if (isNativeError(error) || typeof error === 'string') {
      core.setFailed(error);
    } else {
      core.setFailed(`Unknown error: ${JSON.stringify(error)}`);
    }
  }
}

export type { ActionYml, ActionYmlOutputData, ActionYmlInputData, ActionYmlBranding } from '@action-class/action-yml';
