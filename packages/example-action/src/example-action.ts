import { action, ActionClass, runAction } from '@action-class/core';

interface Repo {
  owner: string;
  repo: string;
}

export class ExampleAction extends action({
  name: 'name',
  description: 'description',
  author: 'author',
  branding: {
    color: 'orange',
    icon: 'sunset',
  },
  inputs: {
    a: { description: 'description a', required: true },
    b: { description: 'description b', trimWhitespace: false, type: 'string[]' },
    c: { description: 'description c', defaultValue: true, type: 'boolean' },
    d: {
      description: 'description d',
      defaultValue: 123,
      validate: (value?: number) => (!!value && value > 0 ? true : 'Value must be greater than 0'),
    },
    e: { description: 'description e', type: 'number', deprecationMessage: 'e is deprecated' },
    f: {
      description: 'description f',
      required: true,
      converter: {
        fromInput: (value: string) => JSON.parse(value) as Repo,
        toInput: (value: Repo) => JSON.stringify(value),
      },
    },
    g: {
      description: 'description g',
      required: true,
      converter: {
        fromInput: (value: string) => new Date(value),
        toInput: (value: Date) => value.toISOString(),
      },
    },
    h: { description: 'description h', defaultValue: 'foo' },
  },
  outputs: {
    a: { description: 'description a' },
    b: { description: 'description b', type: 'boolean' },
    c: { description: 'description c', type: 'number' },
    d: { description: 'description d', converter: (value: Repo) => JSON.stringify(value) },
    e: { description: 'description e', initValue: 123 },
  },
}) {
  private test: string;

  constructor(test: string) {
    super();
    this.test = test;
  }

  async pre(): Promise<void> {
    console.log('post job');
  }

  async main(): Promise<void> {
    console.log(this.inputs);

    this.outputs.a = this.inputs.a;
    this.outputs.b = this.inputs.c;
    this.outputs.c = this.inputs.d;
    this.outputs.d = this.inputs.f;

    console.log(JSON.stringify(this.outputs));
  }

  async post(): Promise<void> {
    console.log('post job');
  }
}

// noinspection JSIgnoredPromiseFromCall
runAction(ExampleAction, 'test');
