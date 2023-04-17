/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNativeError } from 'util/types';
import type { InputOptions } from '@actions/core';
import * as core from '@actions/core';
import type { ActionYml, ActionYmlBranding, ActionYmlInputData, ActionYmlOutputData } from '@action-class/action-yml';
import * as process from 'process';

export type ActionInputConverter<T> = {
  fromInput: (value: string) => T;
  toInput: (value: T) => string;
};

export interface ActionInputDescriptorBase<T> {
  description: string;
  required?: true;
  defaultValue?: NonNullable<T>;
  trimWhitespace?: false;
  validate?: (value?: T) => boolean | string;
  deprecationMessage?: string;
  type?: T extends string
    ? 'string'
    : T extends string[]
    ? 'string[]'
    : T extends boolean
    ? 'boolean'
    : T extends number
    ? 'number'
    : undefined;
  converter?: ActionInputConverter<T>;
}

export interface ActionInputDescriptorImplicitString extends ActionInputDescriptorBase<string> {
  type?: undefined;
  converter?: undefined;
  defaultValue?: undefined;
  validate?: undefined;
}
export interface ActionInputDescriptorString extends ActionInputDescriptorBase<string> {
  type: 'string';
  converter?: undefined;
}
export interface ActionInputDescriptorMultiLine extends ActionInputDescriptorBase<string[]> {
  type: 'string[]';
  converter?: undefined;
}
export interface ActionInputDescriptorBoolean extends ActionInputDescriptorBase<boolean> {
  type: 'boolean';
  converter?: undefined;
}
export interface ActionInputDescriptorNumber extends ActionInputDescriptorBase<number> {
  type: 'number';
  converter?: undefined;
}

export interface ActionInputDescriptorDefaulted<T> extends ActionInputDescriptorBase<T> {
  defaultValue: NonNullable<T>;
  type?: undefined;
  converter?: undefined;
}

export interface ActionInputDescriptorValidated<T> extends ActionInputDescriptorBase<T> {
  validate: (value?: T) => boolean | string;
  type?: undefined;
  converter?: undefined;
}

export interface ActionInputDescriptorConverted<T> extends ActionInputDescriptorBase<T> {
  type?: undefined;
  converter: ActionInputConverter<T>;
}

export type ActionInputDescriptor<T = any> =
  | ActionInputDescriptorImplicitString
  | (T extends string
      ? ActionInputDescriptorString
      : T extends string[]
      ? ActionInputDescriptorMultiLine
      : T extends boolean
      ? ActionInputDescriptorBoolean
      : T extends number
      ? ActionInputDescriptorNumber
      : never)
  | ActionInputDescriptorDefaulted<T>
  | ActionInputDescriptorValidated<T>
  | ActionInputDescriptorConverted<T>;

export type ActionInputNullableIfOptionalAndNoDefault<TInput, T> = TInput extends { required: true }
  ? T
  : TInput extends { defaultValue: NonNullable<T> }
  ? T
  : T | undefined;

export type ActionInputType<
  T extends Pick<ActionInputDescriptorBase<any>, 'type' | 'converter' | 'defaultValue' | 'validate'>,
> = ActionInputNullableIfOptionalAndNoDefault<
  T,
  T extends { type: 'string' }
    ? string
    : T extends { type: 'string[]' }
    ? string[]
    : T extends { type: 'boolean' }
    ? boolean
    : T extends { type: 'number' }
    ? number
    : T extends { defaultValue: infer U }
    ? U
    : T extends { validate: (value?: infer U) => boolean | string }
    ? NonNullable<U>
    : T extends {
        converter: {
          toInput: (value: infer U) => string;
        };
      }
    ? U
    : string
>;

export interface ActionOutputDescriptorBase<T> {
  description: string;
  initValue?: NonNullable<T>;
  converter?: (value: T) => string;
  type?: T extends string ? 'string' : T extends boolean ? 'boolean' : T extends number ? 'number' : undefined;
}

export interface ActionOutputDescriptorImplicitString extends ActionOutputDescriptorBase<string> {
  type?: undefined;
  initValue?: undefined;
  converter?: undefined;
}

export interface ActionOutputDescriptorString extends ActionOutputDescriptorBase<string> {
  type: 'string';
  initValue?: undefined;
  converter?: undefined;
}

export interface ActionOutputDescriptorBoolean extends ActionOutputDescriptorBase<boolean> {
  type: 'boolean';
  initValue?: undefined;
  converter?: undefined;
}

export interface ActionOutputDescriptorNumber extends ActionOutputDescriptorBase<number> {
  type: 'number';
  initValue?: undefined;
  converter?: undefined;
}

export interface ActionOutputDescriptorInitialized<T> extends ActionOutputDescriptorBase<T> {
  type?: undefined;
  initValue: NonNullable<T>;
  converter?: undefined;
}

export interface ActionOutputDescriptorConverted<T> extends ActionOutputDescriptorBase<T> {
  type?: undefined;
  converter: (value: T) => string;
}

export type ActionOutputDescriptor<T = any> =
  | ActionOutputDescriptorImplicitString
  | (T extends string
      ? ActionOutputDescriptorString
      : T extends boolean
      ? ActionOutputDescriptorBoolean
      : T extends number
      ? ActionOutputDescriptorNumber
      : never)
  | ActionOutputDescriptorInitialized<T>
  | ActionOutputDescriptorConverted<T>;

export type ActionOutputType<T extends Pick<ActionOutputDescriptorBase<any>, 'type' | 'initValue' | 'converter'>> =
  T extends { type: 'string' }
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

export type ActionInputDescriptors = Record<string, ActionInputDescriptor>;

export type ActionOutputDescriptors = Record<string, ActionOutputDescriptor>;

export type ActionInputsType<T extends ActionInputDescriptors> = {
  [Key in keyof T]: ActionInputType<T[Key]>;
};

export type ActionOutputsType<T extends ActionOutputDescriptors> = {
  [Key in keyof T]: ActionOutputType<T[Key]>;
};

export interface ActionDescriptor {
  name?: string;
  description?: string;
  author?: string;
  inputs?: ActionInputDescriptors;
  outputs?: ActionOutputDescriptors;
  branding?: ActionYmlBranding;
}

export interface ActionClass<TInputs extends ActionInputDescriptors, TOutputs extends ActionOutputDescriptors> {
  get inputs(): Readonly<ActionInputsType<TInputs>>;
  outputs: ActionOutputsType<NonNullable<TOutputs>>;

  pre?(): Promise<void>;
  main(): Promise<void>;
  post?(): Promise<void>;
}

export type ActionConstructor<TInputs extends ActionInputDescriptors, TOutputs extends ActionOutputDescriptors> = new (
  ...args: any[]
) => ActionClass<TInputs, TOutputs>;

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
      if (inputDescriptor.converter) {
        const strValue = core.getInput(inputsKey, options);
        value = strValue ? inputDescriptor.converter.fromInput(strValue) : undefined;
      } else {
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
export function action<T extends ActionDescriptor>(
  descriptor: T,
): ActionConstructor<NonNullable<T['inputs']>, NonNullable<T['outputs']>> & {
  readonly actionInfo: Readonly<Partial<ActionYml>>;
} {
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
          default: input.converter
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
  return class implements ActionClass<NonNullable<T['inputs']>, NonNullable<T['outputs']>> {
    static readonly actionInfo: Readonly<Partial<ActionYml>> = {
      ...(descriptor.name && { name: descriptor.name }),
      ...(descriptor.description && { description: descriptor.description }),
      ...(descriptor.author && { author: descriptor.author }),
      ...(descriptor.inputs && { inputs }),
      ...(descriptor.outputs && { outputs }),
    };

    readonly #inputs: ActionInputsType<NonNullable<T['inputs']>>;

    get inputs(): Readonly<ActionInputsType<NonNullable<T['inputs']>>> {
      return this.#inputs;
    }

    outputs = {} as ActionOutputsType<NonNullable<T['outputs']>>;

    constructor() {
      this.#inputs = descriptor.inputs ? parseInputs(descriptor.inputs) : {};
      if (descriptor.outputs) {
        const outputProperties = {} as PropertyDescriptorMap & ThisType<ActionOutputsType<NonNullable<T['outputs']>>>;
        for (const output in descriptor.outputs) {
          const outputDescriptor = descriptor.outputs[output];
          let valueStorage: unknown;
          outputProperties[output] = {
            get(): any {
              return valueStorage as ActionOutputType<
                NonNullable<T['outputs']>[Extract<ActionOutputsType<NonNullable<T['outputs']>>, string>]
              >;
            },
            set(value: any): void {
              valueStorage = value;
              if (outputDescriptor.converter) {
                try {
                  core.setOutput(output, outputDescriptor.converter(value));
                } catch (error) {
                  throw prefixError(error, `Error while converting output '${output}':`);
                }
              } else {
                core.setOutput(output, String(value));
              }
            },
            enumerable: true,
          };
        }
        this.outputs = Object.defineProperties({} as ActionOutputsType<NonNullable<T['outputs']>>, outputProperties);

        for (const output in descriptor.outputs) {
          const outputDescriptor = descriptor.outputs[output];
          if (outputDescriptor.initValue) {
            this.outputs[output as keyof ActionOutputsType<NonNullable<T['outputs']>>] = outputDescriptor.initValue;
          }
        }
      }
    }

    async main(): Promise<void> {
      return;
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

export async function runAction<
  D extends ActionDescriptor,
  T extends new (...args: any[]) => ActionClass<NonNullable<D['inputs']>, NonNullable<D['outputs']>>,
>(constructor: T, ...actionArgs: ConstructorParameters<T>): Promise<void> {
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
