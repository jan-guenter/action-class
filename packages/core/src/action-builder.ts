import {
  action,
  ActionDescriptor,
  ActionYmlBranding,
  ActionInputDescriptor,
  ActionOutputDescriptor,
  ActionInputDescriptors,
  ActionOutputDescriptors,
  ActionInputDescriptorString,
  ActionOutputDescriptorString,
  ActionConstructor,
  ActionYml,
} from './action-class.js';

export interface ActionBuilder<
  TInputs extends ActionInputDescriptors = Record<string, never>,
  TOutputs extends ActionOutputDescriptors = Record<string, never>,
> {
  descriptor: Omit<ActionDescriptor, 'inputs' | 'outputs'> & { inputs: TInputs; outputs: TOutputs };

  name(name: string): ActionBuilder<TInputs, TOutputs>;

  description(description: string): ActionBuilder<TInputs, TOutputs>;

  author(author: string, email?: string): ActionBuilder<TInputs, TOutputs>;

  branding(color: ActionYmlBranding['color'], icon: ActionYmlBranding['icon']): ActionBuilder<TInputs, TOutputs>;

  input<K extends string, O extends Omit<ActionInputDescriptor, 'description'>>(
    key: K,
    description: string,
    options: O,
  ): ActionBuilder<TInputs & { [key in K]: O & { description: string } }, TOutputs>;

  input<K extends string, O extends Omit<ActionInputDescriptor, 'description' | 'required'>>(
    key: K,
    description: string,
    required: true,
    options: O,
  ): ActionBuilder<TInputs & { [key in K]: O & { description: string; required: true } }, TOutputs>;

  input<K extends string>(
    key: K,
    description: string,
  ): ActionBuilder<TInputs & { [key in K]: Omit<ActionInputDescriptorString, 'required'> }, TOutputs>;

  input<K extends string>(
    key: K,
    description: string,
    required: true,
  ): ActionBuilder<
    TInputs & { [key in K]: Omit<ActionInputDescriptorString, 'required'> & { required: true } },
    TOutputs
  >;

  input<K extends keyof TInputs, O extends Omit<ActionInputDescriptor, 'description'>>(
    key: K,
    description: string,
    options: O,
  ): ActionBuilder<Omit<TInputs, K> & { [key in K]: O & { description: string } }, TOutputs>;

  input<K extends keyof TInputs, O extends Omit<ActionInputDescriptor, 'description' | 'required'>>(
    key: K,
    description: string,
    required: true,
    options: O,
  ): ActionBuilder<Omit<TInputs, K> & { [key in K]: O & { description: string; required: true } }, TOutputs>;

  input<K extends keyof TInputs>(
    key: K,
    description: string,
  ): ActionBuilder<Omit<TInputs, K> & { [key in K]: Omit<ActionInputDescriptorString, 'required'> }, TOutputs>;

  input<K extends keyof TInputs>(
    key: K,
    description: string,
    required: true,
  ): ActionBuilder<
    Omit<TInputs, K> & { [key in K]: Omit<ActionInputDescriptorString, 'required'> & { required: true } },
    TOutputs
  >;

  inputs<D extends ActionInputDescriptors>(inputs: D): ActionBuilder<TInputs & D, TOutputs>;

  output<K extends string, O extends Omit<ActionOutputDescriptor, 'description'>>(
    key: K,
    description: string,
    options: O,
  ): ActionBuilder<TInputs, TOutputs & { [key in K]: O & { description: string } }>;

  output<K extends string>(
    key: K,
    description: string,
  ): ActionBuilder<TInputs, TOutputs & { [key in K]: ActionOutputDescriptorString }>;

  output<K extends keyof TOutputs, O extends Omit<ActionOutputDescriptor, 'description'>>(
    key: K,
    description: string,
    options: O,
  ): ActionBuilder<TInputs, Omit<TOutputs, K> & { [key in K]: O & { description: string } }>;

  output<K extends keyof TOutputs>(
    key: K,
    description: string,
  ): ActionBuilder<TInputs, Omit<TOutputs, K> & { [key in K]: ActionOutputDescriptorString }>;

  outputs<D extends ActionOutputDescriptors>(outputs: D): ActionBuilder<TInputs & D, TOutputs>;

  build(): ActionConstructor<TInputs, TOutputs> & {
    readonly actionInfo: Readonly<Partial<ActionYml>>;
  };
}

class ActionBuilderImplementation {
  descriptor: ActionDescriptor = {};

  name(name: string): ActionBuilderImplementation {
    this.descriptor.name = name;
    return this;
  }

  description(description: string): ActionBuilderImplementation {
    this.descriptor.description = description;
    return this;
  }

  author(author: string, email?: string): ActionBuilderImplementation {
    this.descriptor.author = author;
    if (email) {
      this.descriptor.author += ` <${email}>`;
    }
    return this;
  }

  branding(color: ActionYmlBranding['color'], icon: ActionYmlBranding['icon']): ActionBuilderImplementation {
    this.descriptor.branding = { color, icon };
    return this;
  }

  input(
    name: string,
    description: string,
    requiredOrOptions?: true | Omit<ActionInputDescriptor, 'description'>,
    options?: Omit<ActionInputDescriptor, 'description'>,
  ): ActionBuilderImplementation {
    if (!this.descriptor.inputs) {
      this.descriptor.inputs = {};
    }
    const opts = (requiredOrOptions === true ? { ...options, required: true } : requiredOrOptions) ?? {
      type: 'string',
    };
    if (!opts.type && !opts.defaultValue && !opts.validate && !opts.converter) {
      opts.type = 'string';
    }
    this.descriptor.inputs[name] = {
      ...opts,
      description,
    } as ActionInputDescriptor;
    return this;
  }

  inputs(inputs: ActionInputDescriptors): ActionBuilderImplementation {
    this.descriptor.inputs = { ...this.descriptor.inputs, ...inputs };
    return this;
  }

  output(
    name: string,
    description: string,
    options?: Omit<ActionOutputDescriptor, 'description'>,
  ): ActionBuilderImplementation {
    if (!this.descriptor.outputs) {
      this.descriptor.outputs = {};
    }
    if (!options) {
      options = { type: 'string' };
    } else if (!options.type && !options.initValue && !options.converter) {
      options.type = 'string';
    }
    this.descriptor.outputs[name] = {
      ...(options ?? { type: 'string' }),
      description,
    } as ActionOutputDescriptor;
    return this;
  }

  outputs(outputs: ActionOutputDescriptors): ActionBuilderImplementation {
    this.descriptor.outputs = { ...this.descriptor.outputs, ...outputs };
    return this;
  }

  build(): ActionConstructor<ActionInputDescriptors, ActionOutputDescriptors> & {
    readonly actionInfo: Readonly<Partial<ActionYml>>;
  } {
    return action(this.descriptor);
  }
}

export function actionBuilder(): ActionBuilder {
  return new ActionBuilderImplementation() as ActionBuilder;
}
